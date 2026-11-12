import type { MoonInfo, Observer, OrbitClass } from './types';

/**
 * Lightweight positional astronomy. Accuracy targets are "good enough to plan
 * an evening": sun position within ~0.1°, moon phase within ~half a day, and a
 * spherical Earth for satellite look angles (errors < 0.3° in elevation).
 */

export const DEG = Math.PI / 180;
export const EARTH_RADIUS_KM = 6371;
/** Earth's standard gravitational parameter, km³/s² */
export const MU_EARTH = 398600.4418;

const SYNODIC_MONTH_DAYS = 29.530588853;
/** A known new moon: 2000-01-06 18:14 UTC */
const REFERENCE_NEW_MOON_JD = 2451550.1;

export const mod = (a: number, n: number) => ((a % n) + n) % n;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const toJulian = (date: Date) => date.getTime() / 86_400_000 + 2440587.5;
const normalizeLng = (lng: number) => mod(lng + 180, 360) - 180;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

/** Earth-centred, Earth-fixed coordinates (km) on a spherical Earth. */
export function geodeticToEcef(latDeg: number, lngDeg: number, altKm: number): Vec3 {
  const lat = latDeg * DEG;
  const lng = lngDeg * DEG;
  const r = EARTH_RADIUS_KM + altKm;
  return {
    x: r * Math.cos(lat) * Math.cos(lng),
    y: r * Math.cos(lat) * Math.sin(lng),
    z: r * Math.sin(lat),
  };
}

function unitVector(latDeg: number, lngDeg: number): Vec3 {
  return geodeticToEcef(latDeg, lngDeg, -EARTH_RADIUS_KM + 1);
}

export interface LookAngles {
  azimuth: number;
  elevation: number;
  rangeKm: number;
}

/** Azimuth/elevation/range from an observer to a point above the Earth. */
export function lookAngles(
  observer: Pick<Observer, 'latitude' | 'longitude' | 'altitudeM'>,
  target: { latitude: number; longitude: number; altitudeKm: number },
): LookAngles {
  const o = geodeticToEcef(observer.latitude, observer.longitude, observer.altitudeM / 1000);
  const s = geodeticToEcef(target.latitude, target.longitude, target.altitudeKm);
  const rx = s.x - o.x;
  const ry = s.y - o.y;
  const rz = s.z - o.z;

  const lat = observer.latitude * DEG;
  const lng = observer.longitude * DEG;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLng = Math.sin(lng);
  const cosLng = Math.cos(lng);

  // Rotate the range vector into local East-North-Up
  const east = -sinLng * rx + cosLng * ry;
  const north = -sinLat * cosLng * rx - sinLat * sinLng * ry + cosLat * rz;
  const up = cosLat * cosLng * rx + cosLat * sinLng * ry + sinLat * rz;

  const rangeKm = Math.sqrt(rx * rx + ry * ry + rz * rz);
  return {
    azimuth: mod(Math.atan2(east, north) / DEG, 360),
    elevation: Math.asin(clamp(up / rangeKm, -1, 1)) / DEG,
    rangeKm,
  };
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export function compassPoint(azimuth: number): string {
  return COMPASS[Math.round(mod(azimuth, 360) / 22.5) % 16] ?? 'N';
}

// ---------------------------------------------------------------------------
// Orbits
// ---------------------------------------------------------------------------
/** Circular-orbit speed at a given altitude (km/s). */
export function orbitalVelocityKms(altitudeKm: number): number {
  return Math.sqrt(MU_EARTH / (EARTH_RADIUS_KM + altitudeKm));
}

/** Circular-orbit period at a given altitude (minutes). */
export function orbitalPeriodMinutes(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + altitudeKm;
  return (2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH)) / 60;
}

export function classifyOrbit(altitudeKm: number): OrbitClass {
  if (altitudeKm < 2000) return 'LEO';
  if (altitudeKm >= 35_286 && altitudeKm <= 36_286) return 'GEO';
  if (altitudeKm < 35_286) return 'MEO';
  return 'HEO';
}

/** Ground-angle radius (degrees) of the area from which an object at this altitude is above the horizon. */
export function horizonGroundAngle(altitudeKm: number): number {
  return Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm)) / DEG;
}

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------
/** Sub-solar point (where the Sun is directly overhead). Low-precision NOAA/USNO algorithm. */
export function subsolarPoint(date: Date): { latitude: number; longitude: number } {
  const n = toJulian(date) - 2451545.0;
  const meanLongitude = mod(280.46 + 0.9856474 * n, 360);
  const meanAnomaly = mod(357.528 + 0.9856003 * n, 360) * DEG;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG;
  const obliquity = (23.439 - 0.0000004 * n) * DEG;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const gmst = mod(280.46061837 + 360.98564736629 * n, 360);

  return {
    latitude: declination / DEG,
    longitude: normalizeLng(rightAscension / DEG - gmst),
  };
}

/** Sun's altitude above the observer's horizon, degrees. */
export function sunElevation(observer: Pick<Observer, 'latitude' | 'longitude'>, date: Date): number {
  const s = subsolarPoint(date);
  const zenith = unitVector(observer.latitude, observer.longitude);
  const sun = unitVector(s.latitude, s.longitude);
  return Math.asin(clamp(dot(zenith, sun), -1, 1)) / DEG;
}

/** Is a satellite in sunlight? Cylindrical Earth-shadow model. */
export function isSunlit(latitude: number, longitude: number, altitudeKm: number, date: Date): boolean {
  const s = subsolarPoint(date);
  const sun = unitVector(s.latitude, s.longitude);
  const r = geodeticToEcef(latitude, longitude, altitudeKm);
  const along = dot(r, sun);
  if (along >= 0) return true;
  const perp = {
    x: r.x - along * sun.x,
    y: r.y - along * sun.y,
    z: r.z - along * sun.z,
  };
  return Math.sqrt(dot(perp, perp)) > EARTH_RADIUS_KM;
}

// ---------------------------------------------------------------------------
// Moon
// ---------------------------------------------------------------------------
function phaseName(phase: number): string {
  if (phase < 0.0339 || phase >= 0.9661) return 'New Moon';
  if (phase < 0.216) return 'Waxing crescent';
  if (phase < 0.284) return 'First quarter';
  if (phase < 0.466) return 'Waxing gibbous';
  if (phase < 0.534) return 'Full Moon';
  if (phase < 0.716) return 'Waning gibbous';
  if (phase < 0.784) return 'Last quarter';
  return 'Waning crescent';
}

export function moonInfo(date: Date): MoonInfo {
  const phase = mod((toJulian(date) - REFERENCE_NEW_MOON_JD) / SYNODIC_MONTH_DAYS, 1);
  const dayMs = 86_400_000;
  const toNew = (1 - phase) * SYNODIC_MONTH_DAYS;
  const toFull = (phase < 0.5 ? 0.5 - phase : 1.5 - phase) * SYNODIC_MONTH_DAYS;
  return {
    phase,
    phaseName: phaseName(phase),
    illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2,
    ageDays: phase * SYNODIC_MONTH_DAYS,
    nextNew: new Date(date.getTime() + toNew * dayMs).toISOString(),
    nextFull: new Date(date.getTime() + toFull * dayMs).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Space environment
// ---------------------------------------------------------------------------
/**
 * Exospheric temperature estimate, simplified from the Jacchia (1970) model:
 * night-time minimum T = 379 + 3.24·F10.7, a geomagnetic term from Kp, and a
 * day-side enhancement. Indicative only — real thermosphere models also need
 * 81-day averages, local solar time and season.
 */
export function exosphericTemperatureK(f107: number, kp: number, sunlit: boolean): number {
  const nightMinimum = 379 + 3.24 * f107;
  const geomagnetic = 28 * kp + 0.03 * Math.exp(kp);
  return Math.round(nightMinimum * (sunlit ? 1.2 : 1) + geomagnetic);
}
