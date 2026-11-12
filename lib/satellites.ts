import {
  DEG,
  classifyOrbit,
  compassPoint,
  exosphericTemperatureK,
  horizonGroundAngle,
  isSunlit,
  lookAngles,
  orbitalPeriodMinutes,
  orbitalVelocityKms,
} from './astro';
import type { Observer, Satellite, SatelliteProfile, SatelliteSpec, SpaceWeather } from './types';

/** Shape returned by N2YO's /above endpoint */
export interface N2YOAboveSatellite {
  satid: number;
  satname: string;
  intDesignator: string;
  launchDate: string;
  satlat: number;
  satlng: number;
  satalt: number;
}

interface CatalogEntry {
  norad?: number;
  match: RegExp;
  operator: string;
  country: string;
  category: string;
  purpose: string;
  specs: SatelliteSpec[];
}

// ---------------------------------------------------------------------------
// Curated reference entries for well-known spacecraft
// ---------------------------------------------------------------------------
const FEATURED: CatalogEntry[] = [
  {
    norad: 25544,
    match: /^(ISS\b|SPACE STATION)/i,
    operator: 'NASA, Roscosmos, ESA, JAXA, CSA',
    country: 'International',
    category: 'Crewed space station',
    purpose:
      'A permanently crewed orbiting laboratory for research in microgravity, biology, materials and Earth observation, continuously occupied since November 2000.',
    specs: [
      { label: 'Mass', value: '≈ 420,000 kg' },
      { label: 'Truss span', value: '109 m' },
      { label: 'Pressurised volume', value: '≈ 916 m³' },
      { label: 'Power', value: 'Solar arrays, 100+ kW' },
      { label: 'Typical crew', value: '7' },
    ],
  },
  {
    norad: 20580,
    match: /^HST$/i,
    operator: 'NASA / ESA',
    country: 'United States / Europe',
    category: 'Space telescope',
    purpose:
      'Observes in ultraviolet, visible and near-infrared light from above the atmosphere. Its observations helped measure the expansion rate of the universe and the ages of galaxies.',
    specs: [
      { label: 'Mass', value: '11,110 kg' },
      { label: 'Length', value: '13.2 m' },
      { label: 'Primary mirror', value: '2.4 m' },
      { label: 'Instruments', value: 'WFC3, ACS, COS, STIS' },
    ],
  },
  {
    norad: 48274,
    match: /TIANHE|^CSS\b/i,
    operator: 'China Manned Space Agency',
    country: 'China',
    category: 'Crewed space station',
    purpose:
      "China's modular Tiangong space station, hosting rotating crews of three for long-duration science and technology experiments.",
    specs: [
      { label: 'Modules', value: 'Tianhe, Wentian, Mengtian' },
      { label: 'Mass', value: '≈ 66,000 kg (three modules)' },
      { label: 'Crew', value: '3 (6 during handovers)' },
    ],
  },
  {
    norad: 33591,
    match: /^NOAA 19$/i,
    operator: 'NOAA',
    country: 'United States',
    category: 'Weather',
    purpose:
      'A polar-orbiting weather satellite from the POES series that images cloud and measures atmospheric temperature and humidity. Its analogue APT signal has long been a favourite of radio amateurs.',
    specs: [
      { label: 'Mass', value: '1,440 kg' },
      { label: 'Orbit', value: 'Sun-synchronous' },
      { label: 'Instruments', value: 'AVHRR/3, AMSU-A, MHS' },
      { label: 'APT downlink', value: '137.100 MHz' },
    ],
  },
  {
    norad: 25994,
    match: /^TERRA$/i,
    operator: 'NASA',
    country: 'United States',
    category: 'Earth observation',
    purpose:
      "Flagship of NASA's Earth Observing System, tracking land, oceans, atmosphere and Earth's energy balance since 1999.",
    specs: [
      { label: 'Mass', value: '5,190 kg' },
      { label: 'Instruments', value: 'MODIS, ASTER, CERES, MISR, MOPITT' },
      { label: 'Orbit', value: 'Sun-synchronous, ≈ 705 km' },
    ],
  },
  {
    norad: 27424,
    match: /^AQUA$/i,
    operator: 'NASA',
    country: 'United States',
    category: 'Earth observation',
    purpose: "Studies Earth's water cycle: evaporation, clouds, precipitation, sea ice and soil moisture.",
    specs: [
      { label: 'Mass', value: '2,934 kg' },
      { label: 'Instruments', value: 'AIRS, AMSU-A, MODIS, CERES' },
    ],
  },
  {
    norad: 39084,
    match: /^LANDSAT 8$/i,
    operator: 'NASA / USGS',
    country: 'United States',
    category: 'Earth observation',
    purpose: "Continues the longest unbroken record of Earth's land surface from space, begun in 1972.",
    specs: [
      { label: 'Mass', value: '2,623 kg' },
      { label: 'Instruments', value: 'OLI, TIRS' },
      { label: 'Resolution', value: '15 m pan, 30 m multispectral' },
    ],
  },
  {
    norad: 49260,
    match: /^LANDSAT 9$/i,
    operator: 'NASA / USGS',
    country: 'United States',
    category: 'Earth observation',
    purpose: 'Works in tandem with Landsat 8 so any spot on Earth is imaged every eight days.',
    specs: [
      { label: 'Mass', value: '2,711 kg' },
      { label: 'Instruments', value: 'OLI-2, TIRS-2' },
    ],
  },
  {
    norad: 44804,
    match: /^CARTOSAT-3$/i,
    operator: 'ISRO',
    country: 'India',
    category: 'Earth observation',
    purpose:
      "One of India's sharpest imaging satellites, delivering sub-metre imagery for mapping, urban planning and infrastructure.",
    specs: [
      { label: 'Mass', value: '1,625 kg' },
      { label: 'Resolution', value: '≈ 0.25 m panchromatic' },
      { label: 'Launch vehicle', value: 'PSLV-C47' },
    ],
  },
  {
    norad: 40697,
    match: /^SENTINEL-2A$/i,
    operator: 'ESA / Copernicus',
    country: 'Europe',
    category: 'Earth observation',
    purpose: 'High-resolution multispectral imaging of land and coastal waters for agriculture, forestry and disaster response.',
    specs: [
      { label: 'Mass', value: '≈ 1,140 kg' },
      { label: 'Instrument', value: 'MSI, 13 spectral bands' },
      { label: 'Best resolution', value: '10 m' },
    ],
  },
  {
    norad: 27386,
    match: /^ENVISAT$/i,
    operator: 'ESA (defunct)',
    country: 'Europe',
    category: 'Defunct satellite',
    purpose:
      "Once Europe's largest Earth-observation satellite. Contact was lost in April 2012 and it now drifts as one of the largest pieces of debris in low orbit.",
    specs: [
      { label: 'Mass', value: '8,211 kg' },
      { label: 'Status', value: 'Uncontrolled since 2012' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Pattern-based profiles for large families of objects
// ---------------------------------------------------------------------------
const PATTERNS: CatalogEntry[] = [
  {
    match: /R\/B|ROCKET BODY|\bAKM\b/i,
    operator: 'Launch provider',
    country: 'Various',
    category: 'Rocket body',
    purpose:
      'A spent rocket stage left in orbit after delivering its payload. It is inactive debris, tracked so operators can avoid collisions.',
    specs: [{ label: 'Status', value: 'Inactive' }],
  },
  {
    match: /\bDEB\b|DEBRIS/i,
    operator: 'None',
    country: 'Various',
    category: 'Debris fragment',
    purpose: 'A fragment from a break-up, collision or anti-satellite test. At orbital speed even small pieces can damage a spacecraft.',
    specs: [{ label: 'Status', value: 'Uncontrolled debris' }],
  },
  {
    match: /STARLINK/i,
    operator: 'SpaceX',
    country: 'United States',
    category: 'Broadband constellation',
    purpose:
      'One of thousands of SpaceX satellites delivering low-latency broadband internet, linked to each other by laser crosslinks.',
    specs: [
      { label: 'Mass', value: '≈ 300–800 kg (by version)' },
      { label: 'Propulsion', value: 'Hall-effect thrusters' },
      { label: 'Typical shell', value: '≈ 340–570 km' },
    ],
  },
  {
    match: /ONEWEB/i,
    operator: 'Eutelsat OneWeb',
    country: 'United Kingdom / France',
    category: 'Broadband constellation',
    purpose: 'Part of a high-LEO constellation providing broadband connectivity to remote regions, aircraft and ships.',
    specs: [
      { label: 'Mass', value: '≈ 150 kg' },
      { label: 'Altitude', value: '≈ 1,200 km' },
    ],
  },
  {
    match: /IRIDIUM/i,
    operator: 'Iridium Communications',
    country: 'United States',
    category: 'Communications',
    purpose: 'Global voice and data relay. Iridium NEXT uses 66 active, cross-linked satellites covering the whole planet.',
    specs: [
      { label: 'Active constellation', value: '66 satellites' },
      { label: 'Altitude', value: '≈ 780 km' },
    ],
  },
  {
    match: /^GSAT0\d{3}|GALILEO/i,
    operator: 'EU / ESA',
    country: 'Europe',
    category: 'Navigation',
    purpose: "Part of Galileo, Europe's global navigation satellite system.",
    specs: [{ label: 'Orbit', value: 'MEO, ≈ 23,222 km' }],
  },
  {
    match: /IRNSS|NVS-?\d/i,
    operator: 'ISRO',
    country: 'India',
    category: 'Navigation',
    purpose: "Part of NavIC, India's regional navigation system covering India and about 1,500 km beyond its borders.",
    specs: [{ label: 'Orbit', value: 'Geosynchronous' }],
  },
  {
    match: /^GSAT[- ]?\d{1,2}\b|^INSAT/i,
    operator: 'ISRO',
    country: 'India',
    category: 'Communications',
    purpose: 'An Indian geostationary satellite serving television, telecom and weather services.',
    specs: [{ label: 'Orbit', value: 'Geostationary' }],
  },
  {
    match: /RESOURCESAT|OCEANSAT|RISAT|CARTOSAT|SCATSAT|\bEOS-\d/i,
    operator: 'ISRO',
    country: 'India',
    category: 'Earth observation',
    purpose: "Part of ISRO's Earth-observation fleet supporting agriculture, ocean monitoring, mapping and disaster management.",
    specs: [],
  },
  {
    match: /GPS|NAVSTAR/i,
    operator: 'US Space Force',
    country: 'United States',
    category: 'Navigation',
    purpose: 'Part of the Global Positioning System that times and locates billions of receivers worldwide.',
    specs: [{ label: 'Orbit', value: 'MEO, ≈ 20,200 km' }],
  },
  {
    match: /BEIDOU/i,
    operator: 'China Satellite Navigation Office',
    country: 'China',
    category: 'Navigation',
    purpose: "Part of BeiDou, China's global navigation satellite system.",
    specs: [],
  },
  {
    match: /^SENTINEL/i,
    operator: 'ESA / Copernicus',
    country: 'Europe',
    category: 'Earth observation',
    purpose: "Part of Europe's Copernicus programme, monitoring land, ocean and atmosphere.",
    specs: [],
  },
  {
    match: /^NOAA|^METOP|^METEOR-M|FENGYUN|^FY-\d/i,
    operator: 'National weather agency',
    country: 'Various',
    category: 'Weather',
    purpose: 'A polar-orbiting weather satellite feeding global forecast models with temperature, humidity and cloud data.',
    specs: [{ label: 'Orbit', value: 'Sun-synchronous' }],
  },
  {
    match: /YAOGAN/i,
    operator: 'People’s Liberation Army',
    country: 'China',
    category: 'Reconnaissance',
    purpose: 'Part of a Chinese military reconnaissance series; mission details are not public.',
    specs: [],
  },
  {
    match: /COSMOS|KOSMOS/i,
    operator: 'Russian government',
    country: 'Russia',
    category: 'Government / military',
    purpose: 'Part of the long-running Kosmos series; many are military or classified.',
    specs: [],
  },
  {
    match: /FLOCK|DOVE|SKYSAT/i,
    operator: 'Planet Labs',
    country: 'United States',
    category: 'Earth imaging',
    purpose: 'One of Planet’s imaging satellites, part of a fleet that photographs much of Earth’s landmass every day.',
    specs: [],
  },
  {
    match: /LEMUR/i,
    operator: 'Spire Global',
    country: 'United States',
    category: 'Weather & tracking',
    purpose: 'A CubeSat collecting GPS radio-occultation weather data and tracking ships and aircraft.',
    specs: [{ label: 'Form factor', value: '3U CubeSat' }],
  },
  {
    match: /\b(AO|FO|SO|RS|XW|CAS)-\d+/i,
    operator: 'Amateur radio community',
    country: 'Various',
    category: 'Amateur radio',
    purpose: 'An amateur-radio satellite that licensed operators can use to relay voice or data contacts.',
    specs: [],
  },
];

function toProfile(entry: CatalogEntry, featured: boolean): SatelliteProfile {
  return {
    operator: entry.operator,
    country: entry.country,
    category: entry.category,
    purpose: entry.purpose,
    specs: entry.specs,
    featured,
  };
}

export function profileFor(noradId: number, name: string): SatelliteProfile {
  const featured = FEATURED.find((e) => e.norad === noradId) ?? FEATURED.find((e) => e.match.test(name));
  if (featured) return toProfile(featured, true);
  const pattern = PATTERNS.find((e) => e.match.test(name));
  if (pattern) return toProfile(pattern, false);
  return {
    operator: 'Not in reference list',
    country: '—',
    category: 'Catalogued object',
    purpose:
      "A tracked object in the public satellite catalogue. Its operator and mission aren't in AetherOrbit's reference list yet — the AI explainer can summarise what is publicly known.",
    specs: [],
    featured: false,
  };
}

// ---------------------------------------------------------------------------
// Environment estimates
// ---------------------------------------------------------------------------
function radiationZone(altitudeKm: number): string {
  if (altitudeKm < 1000) return 'Below the inner Van Allen belt; brief proton spikes over the South Atlantic Anomaly';
  if (altitudeKm < 6000) return 'Inner Van Allen belt: intense trapped-proton flux';
  if (altitudeKm < 13000) return 'Slot region between the Van Allen belts';
  if (altitudeKm < 40000) return 'Outer Van Allen belt: energetic electrons and charging risk';
  return 'Beyond the outer belt: exposed to solar wind and cosmic rays';
}

function dragRegime(altitudeKm: number): string {
  if (altitudeKm < 300) return 'Very high: orbit decays within weeks without propulsion';
  if (altitudeKm < 500) return 'Significant: needs regular reboosts';
  if (altitudeKm < 800) return 'Moderate: orbit decays over years to decades';
  if (altitudeKm < 1200) return 'Low: orbit lasts centuries';
  return 'Negligible';
}

export function enrichSatellite(
  raw: N2YOAboveSatellite,
  observer: Observer,
  spaceWeather: SpaceWeather | null,
  now: Date,
): Satellite {
  const altitudeKm = Math.max(0, raw.satalt);
  const look = lookAngles(observer, { latitude: raw.satlat, longitude: raw.satlng, altitudeKm });
  const sunlit = isSunlit(raw.satlat, raw.satlng, altitudeKm, now);
  const kp = spaceWeather?.kp ?? 2;
  const f107 = spaceWeather?.f107 ?? 150;

  return {
    noradId: raw.satid,
    name: raw.satname.trim(),
    intlDesignator: raw.intDesignator || '—',
    launchDate: raw.launchDate || null,
    latitude: raw.satlat,
    longitude: raw.satlng,
    altitudeKm,
    velocityKms: orbitalVelocityKms(altitudeKm),
    periodMinutes: orbitalPeriodMinutes(altitudeKm),
    orbitClass: classifyOrbit(altitudeKm),
    azimuth: look.azimuth,
    elevation: look.elevation,
    rangeKm: look.rangeKm,
    compass: compassPoint(look.azimuth),
    sunlit,
    environment: {
      thermosphereK: altitudeKm <= 1000 ? exosphericTemperatureK(f107, kp, sunlit) : null,
      surfaceTempC: sunlit ? { min: 10, max: 120 } : { min: -150, max: -40 },
      radiationZone: radiationZone(altitudeKm),
      atmosphericDrag: dragRegime(altitudeKm),
    },
    profile: profileFor(raw.satid, raw.satname),
  };
}

// ---------------------------------------------------------------------------
// Simulated sky (used when N2YO is unavailable or no key is configured)
// ---------------------------------------------------------------------------
interface MockSat {
  satid: number;
  satname: string;
  intDesignator: string;
  launchDate: string;
  satalt: number;
  /** ground distance from the observer, as a fraction of the visibility radius */
  ring: number;
  /** angular speed around the observer, degrees per second */
  speed: number;
  phase: number;
}

const MOCK_FLEET: MockSat[] = [
  { satid: 25544, satname: 'SPACE STATION', intDesignator: '1998-067A', launchDate: '1998-11-20', satalt: 418, ring: 0.35, speed: 0.22, phase: 20 },
  { satid: 20580, satname: 'HST', intDesignator: '1990-037B', launchDate: '1990-04-24', satalt: 515, ring: 0.62, speed: -0.12, phase: 140 },
  { satid: 48274, satname: 'CSS (TIANHE)', intDesignator: '2021-035A', launchDate: '2021-04-29', satalt: 385, ring: 0.72, speed: 0.16, phase: 250 },
  { satid: 33591, satname: 'NOAA 19', intDesignator: '2009-005A', launchDate: '2009-02-06', satalt: 850, ring: 0.5, speed: 0.08, phase: 300 },
  { satid: 44804, satname: 'CARTOSAT-3', intDesignator: '2019-081A', launchDate: '2019-11-27', satalt: 505, ring: 0.28, speed: -0.18, phase: 80 },
  { satid: 40697, satname: 'SENTINEL-2A', intDesignator: '2015-028A', launchDate: '2015-06-23', satalt: 786, ring: 0.8, speed: 0.06, phase: 190 },
  { satid: 25994, satname: 'TERRA', intDesignator: '1999-068A', launchDate: '1999-12-18', satalt: 705, ring: 0.45, speed: -0.07, phase: 220 },
  { satid: 27386, satname: 'ENVISAT', intDesignator: '2002-009A', launchDate: '2002-03-01', satalt: 765, ring: 0.66, speed: 0.05, phase: 40 },
  { satid: 0, satname: 'STARLINK (SIMULATED)', intDesignator: '—', launchDate: '', satalt: 550, ring: 0.55, speed: 0.3, phase: 330 },
];

export function mockSatellites(observer: Observer, now: Date): N2YOAboveSatellite[] {
  const t = now.getTime() / 1000;
  return MOCK_FLEET.map((m) => {
    const groundRadius = horizonGroundAngle(m.satalt) * m.ring;
    const theta = (m.phase + t * m.speed) * DEG;
    const lat = observer.latitude + groundRadius * Math.cos(theta);
    const lng = observer.longitude + (groundRadius * Math.sin(theta)) / Math.cos(lat * DEG);
    return {
      satid: m.satid,
      satname: m.satname,
      intDesignator: m.intDesignator,
      launchDate: m.launchDate,
      satlat: lat,
      satlng: lng,
      satalt: m.satalt,
    };
  });
}
