import { clamp, moonInfo, sunElevation } from './astro';
import type {
  HourlyCondition,
  Observer,
  StargazingFactor,
  StargazingReport,
  WeatherBundle,
  WeatherNow,
} from './types';

/** Subset of the Open-Meteo /v1/forecast response that AetherOrbit requests */
export interface OpenMeteoResponse {
  utc_offset_seconds?: number;
  current?: {
    time: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    cloud_cover?: number;
    visibility?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    is_day?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    relative_humidity_2m: number[];
    precipitation_probability: Array<number | null>;
  };
  daily?: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
}

export const OPEN_METEO_CURRENT =
  'temperature_2m,relative_humidity_2m,cloud_cover,visibility,wind_speed_10m,weather_code,is_day';
export const OPEN_METEO_HOURLY =
  'temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,relative_humidity_2m,precipitation_probability';

const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Heavy showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

export const describeWeatherCode = (code: number) => WMO_CODES[code] ?? 'Unsettled';

/** "Dark enough" threshold: the Sun 12° below the horizon (end of nautical twilight). */
const DARK_SUN_ELEVATION = -12;

function localToIso(local: string, offsetSeconds: number): string {
  const withSeconds = local.length === 16 ? `${local}:00` : local;
  return new Date(Date.parse(`${withSeconds}Z`) - offsetSeconds * 1000).toISOString();
}

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

interface ScoreInputs {
  cloudCover: number;
  humidity: number;
  visibilityM: number;
  precipProbability: number;
  moonIllumination: number;
}

function factorScores(h: ScoreInputs) {
  return {
    cloud: clamp(100 - h.cloudCover, 0, 100),
    humidity: clamp(100 - Math.max(0, h.humidity - 40) * 1.6, 0, 100),
    visibility: clamp((h.visibilityM / 20_000) * 100, 0, 100),
    rain: clamp(100 - h.precipProbability, 0, 100),
    moon: clamp(100 - h.moonIllumination * 70, 0, 100),
  };
}

/**
 * Cloud cover gates everything: an overcast sky scores zero no matter how
 * dry or moonless it is. The other factors scale the clear-sky fraction.
 */
export function hourScore(h: ScoreInputs): number {
  const f = factorScores(h);
  const quality = 0.3 * f.humidity + 0.2 * f.visibility + 0.25 * f.rain + 0.25 * f.moon;
  return Math.round((f.cloud / 100) * (35 + 0.65 * quality));
}

function ratingFor(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Fair';
  if (score >= 15) return 'Poor';
  return 'Clouded out';
}

function summarise(score: number, cloud: number, rain: number, moonIllumination: number, humidity: number): string {
  if (rain >= 60) return 'Rain is likely during the dark hours. Keep the telescope indoors tonight.';
  if (cloud >= 75) return 'Thick cloud is expected to hide most of the sky tonight.';
  if (cloud >= 45) return 'Expect broken cloud. Bright planets and the Moon may show through the gaps.';
  if (moonIllumination >= 0.75) return 'Skies look fairly clear, but a bright Moon will wash out faint stars and the Milky Way.';
  if (humidity >= 85) return 'Clear patches are likely, though humid air will soften faint stars near the horizon.';
  if (score >= 65) return 'Good conditions for constellations, planets and bright deep-sky objects.';
  return 'Mixed conditions. Check back closer to dusk as the forecast firms up.';
}

function buildNow(json: OpenMeteoResponse, hours: HourlyCondition[], offset: number, now: Date): WeatherNow {
  const nearest =
    hours.reduce<HourlyCondition | null>((best, h) => {
      if (!best) return h;
      return Math.abs(Date.parse(h.time) - now.getTime()) < Math.abs(Date.parse(best.time) - now.getTime()) ? h : best;
    }, null) ?? null;
  const c = json.current;
  const code = c?.weather_code ?? (nearest && nearest.cloudCover > 80 ? 3 : nearest && nearest.cloudCover > 40 ? 2 : 1);
  return {
    time: c?.time ? localToIso(c.time, offset) : now.toISOString(),
    temperatureC: c?.temperature_2m ?? nearest?.temperatureC ?? 0,
    humidity: c?.relative_humidity_2m ?? nearest?.humidity ?? 0,
    cloudCover: c?.cloud_cover ?? nearest?.cloudCover ?? 0,
    visibilityM: c?.visibility ?? nearest?.visibilityM ?? 0,
    windKmh: c?.wind_speed_10m ?? 0,
    weatherCode: code,
    description: describeWeatherCode(code),
    isDay: c?.is_day !== undefined ? c.is_day === 1 : (nearest?.sunElevation ?? 0) > 0,
  };
}

export function buildWeatherBundle(json: OpenMeteoResponse, observer: Observer, now: Date): WeatherBundle {
  const offset = json.utc_offset_seconds ?? 19_800;
  const nowMs = now.getTime();
  const h = json.hourly;

  const all: HourlyCondition[] = h.time.map((t, i) => {
    const time = localToIso(t, offset);
    const date = new Date(time);
    const sunEl = sunElevation(observer, date);
    const moon = moonInfo(date);
    const inputs: ScoreInputs = {
      cloudCover: h.cloud_cover[i] ?? 0,
      humidity: h.relative_humidity_2m[i] ?? 0,
      visibilityM: h.visibility[i] ?? 20_000,
      precipProbability: h.precipitation_probability[i] ?? 0,
      moonIllumination: moon.illumination,
    };
    return {
      time,
      temperatureC: h.temperature_2m[i] ?? 0,
      cloudCover: inputs.cloudCover,
      cloudLow: h.cloud_cover_low[i] ?? 0,
      cloudMid: h.cloud_cover_mid[i] ?? 0,
      cloudHigh: h.cloud_cover_high[i] ?? 0,
      humidity: inputs.humidity,
      visibilityM: inputs.visibilityM,
      precipProbability: inputs.precipProbability,
      sunElevation: Math.round(sunEl * 10) / 10,
      moonIllumination: moon.illumination,
      isDark: sunEl < DARK_SUN_ELEVATION,
      score: hourScore(inputs),
    };
  });

  // The coming (or current) night: first dark hour from the current hour onward, then every contiguous dark hour.
  const upcoming = all.filter((x) => Date.parse(x.time) >= nowMs - 3_600_000);
  const startIdx = upcoming.findIndex((x) => x.isDark);
  const night: HourlyCondition[] = [];
  if (startIdx >= 0) {
    for (let i = startIdx; i < upcoming.length && upcoming[i]?.isDark; i++) {
      const hour = upcoming[i];
      if (hour) night.push(hour);
    }
  }

  // Timeline for the chart: a little dusk before, the night, and the first hour of dawn.
  let timeline: HourlyCondition[];
  if (night.length) {
    const first = upcoming.indexOf(night[0]!);
    const from = Math.max(0, first - 3);
    timeline = upcoming.slice(from, Math.min(upcoming.length, first + night.length + 1)).slice(0, 18);
  } else {
    timeline = upcoming.slice(0, 18);
  }

  // Best two-hour window
  let bestWindow: StargazingReport['bestWindow'] = null;
  for (let i = 0; i < night.length; i++) {
    const a = night[i]!;
    const b = night[i + 1];
    const score = Math.round(b ? (a.score + b.score) / 2 : a.score);
    if (!bestWindow || score > bestWindow.score) {
      bestWindow = {
        start: a.time,
        end: new Date(Date.parse((b ?? a).time) + 3_600_000).toISOString(),
        score,
      };
    }
  }

  const basis = night.length ? night : timeline;
  const meanScore = avg(basis.map((x) => x.score));
  const score = Math.round(night.length ? 0.6 * meanScore + 0.4 * (bestWindow?.score ?? meanScore) : meanScore);

  const cloud = avg(basis.map((x) => x.cloudCover));
  const humidity = avg(basis.map((x) => x.humidity));
  const visibility = avg(basis.map((x) => x.visibilityM));
  const rain = Math.max(0, ...basis.map((x) => x.precipProbability));
  const moonTonight = moonInfo(new Date(night[0]?.time ?? now.toISOString()));
  const fs = factorScores({
    cloudCover: cloud,
    humidity,
    visibilityM: visibility,
    precipProbability: rain,
    moonIllumination: moonTonight.illumination,
  });

  const factors: StargazingFactor[] = [
    { key: 'cloud', label: 'Cloud cover', value: `${Math.round(cloud)}%`, score: Math.round(fs.cloud) },
    { key: 'humidity', label: 'Humidity', value: `${Math.round(humidity)}%`, score: Math.round(fs.humidity) },
    { key: 'visibility', label: 'Visibility', value: `${(visibility / 1000).toFixed(1)} km`, score: Math.round(fs.visibility) },
    { key: 'rain', label: 'Rain chance', value: `${Math.round(rain)}%`, score: Math.round(fs.rain) },
    {
      key: 'moon',
      label: 'Moonlight',
      value: `${Math.round(moonTonight.illumination * 100)}% lit`,
      score: Math.round(fs.moon),
    },
  ];

  const today = json.daily;
  const sunsetLocal = today?.sunset.find((s) => Date.parse(localToIso(s, offset)) > nowMs - 6 * 3_600_000);
  const sunriseLocal = today?.sunrise.find((s) => Date.parse(localToIso(s, offset)) > nowMs);

  return {
    now: buildNow(json, all, offset, now),
    moon: moonInfo(now),
    stargazing: {
      score,
      rating: ratingFor(score),
      summary: summarise(score, cloud, rain, moonTonight.illumination, humidity),
      factors,
      bestWindow,
      hours: timeline,
      darkStart: night[0]?.time ?? null,
      darkEnd: night.length ? new Date(Date.parse(night[night.length - 1]!.time) + 3_600_000).toISOString() : null,
      sunset: sunsetLocal ? localToIso(sunsetLocal, offset) : null,
      sunrise: sunriseLocal ? localToIso(sunriseLocal, offset) : null,
    },
  };
}

/** Plausible, deterministic Kerala-style forecast used if Open-Meteo can't be reached. */
export function mockOpenMeteo(now: Date): OpenMeteoResponse {
  const offset = 19_800;
  const local = new Date(now.getTime() + offset * 1000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const seed = d + m * 31;

  const time: string[] = [];
  const temperature: number[] = [];
  const cloud: number[] = [];
  const low: number[] = [];
  const mid: number[] = [];
  const high: number[] = [];
  const vis: number[] = [];
  const rh: number[] = [];
  const pp: number[] = [];

  for (let i = 0; i < 72; i++) {
    const t = new Date(Date.UTC(y, m, d, i));
    time.push(`${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:00`);
    const hourOfDay = i % 24;
    const c = clamp(Math.round(48 + 34 * Math.sin((i + seed) / 5) + 10 * Math.sin(i / 2.3)), 0, 100);
    cloud.push(c);
    low.push(Math.round(c * 0.5));
    mid.push(Math.round(c * 0.3));
    high.push(Math.round(c * 0.4));
    rh.push(clamp(Math.round(78 + 12 * Math.sin((i - 4) / 3.8)), 40, 100));
    vis.push(Math.round(clamp(24_000 - c * 120, 6_000, 24_140)));
    pp.push(c > 70 ? Math.min(90, c - 35) : 5);
    temperature.push(Math.round((25 + 5 * Math.sin(((hourOfDay - 9) / 24) * 2 * Math.PI)) * 10) / 10);
  }

  const dayStr = (offsetDays: number) => {
    const t = new Date(Date.UTC(y, m, d + offsetDays));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  };

  return {
    utc_offset_seconds: offset,
    hourly: {
      time,
      temperature_2m: temperature,
      cloud_cover: cloud,
      cloud_cover_low: low,
      cloud_cover_mid: mid,
      cloud_cover_high: high,
      visibility: vis,
      relative_humidity_2m: rh,
      precipitation_probability: pp,
    },
    daily: {
      time: [dayStr(0), dayStr(1), dayStr(2)],
      sunrise: [0, 1, 2].map((n) => `${dayStr(n)}T06:12`),
      sunset: [0, 1, 2].map((n) => `${dayStr(n)}T18:10`),
    },
  };
}
