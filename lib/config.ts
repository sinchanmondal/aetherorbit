import type { Observer } from './types';

function envNumber(value: string | undefined, fallback: number): number {
  const n = value === undefined || value === '' ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * The observing site. Defaults to Vallichira, Kottayam district, Kerala
 * (9.719833° N, 76.651694° E). NEXT_PUBLIC_ vars are inlined at build time,
 * so the same values are used on the server and in the browser.
 */
export const OBSERVER: Observer = {
  name: process.env.NEXT_PUBLIC_OBSERVER_NAME || 'Vallichira, Kerala',
  latitude: envNumber(process.env.NEXT_PUBLIC_OBSERVER_LAT, 9.719833),
  longitude: envNumber(process.env.NEXT_PUBLIC_OBSERVER_LNG, 76.651694),
  altitudeM: envNumber(process.env.NEXT_PUBLIC_OBSERVER_ALT_M, 30),
  timezone: 'Asia/Kolkata',
};

export const OBSERVER_SHORT_NAME = OBSERVER.name.split(',')[0]?.trim() || OBSERVER.name;

/** IST is a fixed offset (no daylight saving), which keeps date maths simple. */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const ISS_NORAD_ID = 25544;
