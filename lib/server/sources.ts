import { OBSERVER } from '@/lib/config';
import { mockSatellites, type N2YOAboveSatellite } from '@/lib/satellites';
import {
  OPEN_METEO_CURRENT,
  OPEN_METEO_HOURLY,
  buildWeatherBundle,
  mockOpenMeteo,
  type OpenMeteoResponse,
} from '@/lib/stargazing';
import type { Agency, Launch, LiveStream, SourceStatus, SpaceWeather, VisualPass, WeatherBundle } from '@/lib/types';

/**
 * Every fetcher here returns data plus a status and never throws: when an
 * upstream API is down or a key is missing, it falls back to clearly-labelled
 * simulated data so the dashboard always renders.
 *
 * Caching uses Next.js' data cache (`next.revalidate`) keyed by URL, which
 * keeps us inside each provider's rate limits:
 *   N2YO /above      60 s   (limit 100/h)
 *   N2YO passes      1 h    (limit 100/h)
 *   NOAA SWPC        5 min
 *   Open-Meteo       15 min
 *   YouTube search   15 min (100 quota units each; 10,000/day default)
 *   Launch Library   30 min (limit 15/h unauthenticated)
 */

export interface SourceResult<T> {
  data: T;
  status: SourceStatus;
}

const TIMEOUT_MS = 9_000;
const N2YO_BASE = 'https://api.n2yo.com/rest/v1/satellite';

const stamp = () => new Date().toISOString();
const liveStatus = (message?: string): SourceStatus => ({ source: 'live', ok: true, message, fetchedAt: stamp() });
const mockStatus = (message: string, ok = true): SourceStatus => ({ source: 'mock', ok, message, fetchedAt: stamp() });
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'unknown error');

async function getJson<T>(url: string, revalidate: number, headers: Record<string, string> = {}): Promise<T> {
  const host = new URL(url).hostname;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'AetherOrbit/1.0', ...headers },
      next: { revalidate },
    });
    // Error messages deliberately include only the host — URLs may carry API keys.
    if (!res.ok) throw new Error(`${host} returned HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error(`${host} timed out`);
    if (err instanceof Error && err.message.startsWith(host)) throw err;
    throw new Error(`${host} could not be reached`);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// N2YO — satellites above the observer
// ---------------------------------------------------------------------------
export async function fetchSatellitesAbove(category: number, now = new Date()): Promise<SourceResult<N2YOAboveSatellite[]>> {
  const key = process.env.N2YO_API_KEY;
  if (!key) {
    return {
      data: mockSatellites(OBSERVER, now),
      status: mockStatus('Add N2YO_API_KEY to track real satellites. Showing a simulated sky.'),
    };
  }
  // Search radius (degrees from zenith). "All objects" is restricted to keep payloads sane.
  const radius = category === 0 ? 45 : 88;
  const { latitude, longitude, altitudeM } = OBSERVER;
  const url = `${N2YO_BASE}/above/${latitude}/${longitude}/${altitudeM}/${radius}/${category}/&apiKey=${encodeURIComponent(key)}`;
  try {
    const json = await getJson<{ error?: string; above?: N2YOAboveSatellite[] }>(url, 60);
    if (json.error) throw new Error(`N2YO: ${json.error}`);
    return { data: json.above ?? [], status: liveStatus() };
  } catch (e) {
    return {
      data: mockSatellites(OBSERVER, now),
      status: mockStatus(`N2YO is unavailable (${errorMessage(e)}). Showing a simulated sky.`, false),
    };
  }
}

// ---------------------------------------------------------------------------
// N2YO — visible (naked-eye) passes
// ---------------------------------------------------------------------------
interface N2YOPass {
  startAz: number;
  startAzCompass: string;
  startUTC: number;
  maxAz: number;
  maxAzCompass: string;
  maxEl: number;
  maxUTC: number;
  endAz: number;
  endAzCompass: string;
  endUTC: number;
  mag?: number;
  duration: number;
}

function mockPasses(noradId: number, name: string, now: Date): VisualPass[] {
  const base = new Date(now);
  base.setUTCHours(13, 35, 0, 0); // 19:05 IST
  if (base.getTime() < now.getTime()) base.setUTCDate(base.getUTCDate() + 1);
  const compasses = [
    ['SW', 'SSE', 'E'],
    ['WSW', 'NNW', 'NE'],
    ['W', 'N', 'NE'],
    ['SSW', 'SE', 'ENE'],
  ];
  return [0, 1, 2, 3].map((i) => {
    const start = base.getTime() + i * 86_400_000 + i * 47 * 60_000;
    const duration = 300 + ((i * 97) % 240);
    const c = compasses[i % compasses.length]!;
    return {
      noradId,
      satelliteName: name,
      start: new Date(start).toISOString(),
      peak: new Date(start + (duration / 2) * 1000).toISOString(),
      end: new Date(start + duration * 1000).toISOString(),
      startCompass: c[0]!,
      peakCompass: c[1]!,
      endCompass: c[2]!,
      maxElevation: [62, 34, 18, 47][i]!,
      magnitude: [-3.4, -2.1, -1.2, -2.8][i]!,
      durationSec: duration,
    };
  });
}

export async function fetchVisualPasses(
  noradId: number,
  name: string,
  days = 7,
  minVisibilitySec = 120,
): Promise<SourceResult<VisualPass[]>> {
  const key = process.env.N2YO_API_KEY;
  const now = new Date();
  if (!key) {
    return { data: mockPasses(noradId, name, now), status: mockStatus('Add N2YO_API_KEY for real pass predictions. Showing examples.') };
  }
  const { latitude, longitude, altitudeM } = OBSERVER;
  const url = `${N2YO_BASE}/visualpasses/${noradId}/${latitude}/${longitude}/${altitudeM}/${Math.min(10, days)}/${minVisibilitySec}/&apiKey=${encodeURIComponent(key)}`;
  try {
    const json = await getJson<{ error?: string; info?: { satname?: string }; passes?: N2YOPass[] }>(url, 3_600);
    if (json.error) throw new Error(`N2YO: ${json.error}`);
    const satName = json.info?.satname ?? name;
    const passes = (json.passes ?? [])
      .map<VisualPass>((p) => ({
        noradId,
        satelliteName: satName,
        start: new Date(p.startUTC * 1000).toISOString(),
        peak: new Date(p.maxUTC * 1000).toISOString(),
        end: new Date(p.endUTC * 1000).toISOString(),
        startCompass: p.startAzCompass,
        peakCompass: p.maxAzCompass,
        endCompass: p.endAzCompass,
        maxElevation: Math.round(p.maxEl),
        magnitude: typeof p.mag === 'number' && Math.abs(p.mag) < 50 ? p.mag : null,
        durationSec: p.duration,
      }))
      .filter((p) => Date.parse(p.end) > now.getTime());
    return { data: passes, status: liveStatus(passes.length ? undefined : 'No naked-eye passes in the next few days.') };
  } catch (e) {
    return { data: mockPasses(noradId, name, now), status: mockStatus(`Pass predictions unavailable (${errorMessage(e)}).`, false) };
  }
}

// ---------------------------------------------------------------------------
// NOAA Space Weather Prediction Center
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

/** SWPC products come as either [header, ...rows] arrays or arrays of objects. Normalise both. */
function rowsFrom(json: unknown): Row[] {
  if (!Array.isArray(json) || json.length === 0) return [];
  if (Array.isArray(json[0])) {
    const header = (json[0] as unknown[]).map(String);
    return (json.slice(1) as unknown[]).filter(Array.isArray).map((r) => Object.fromEntries(header.map((h, i) => [h, (r as unknown[])[i]])));
  }
  return json.filter((r): r is Row => typeof r === 'object' && r !== null);
}

const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

function latestWith(rows: Row[], keys: string[]): Row | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row && keys.some((k) => toNumber(row[k]) !== null)) return row;
  }
  return null;
}

function pick(row: Row | null, keys: string[]): number | null {
  if (!row) return null;
  for (const k of keys) {
    const v = toNumber(row[k]);
    if (v !== null) return v;
  }
  return null;
}

export function geomagneticLevel(kp: number | null): string {
  if (kp === null) return 'Unknown';
  const k = Math.round(kp);
  if (k <= 3) return 'Quiet';
  if (k === 4) return 'Active';
  if (k === 5) return 'G1 minor storm';
  if (k === 6) return 'G2 moderate storm';
  if (k === 7) return 'G3 strong storm';
  if (k === 8) return 'G4 severe storm';
  return 'G5 extreme storm';
}

const SWPC = 'https://services.swpc.noaa.gov';

export async function fetchSpaceWeather(): Promise<SourceResult<SpaceWeather>> {
  const [kpRes, plasmaRes, magRes, fluxRes] = await Promise.allSettled([
    getJson<unknown>(`${SWPC}/products/noaa-planetary-k-index.json`, 300),
    getJson<unknown>(`${SWPC}/products/solar-wind/plasma-1-day.json`, 300),
    getJson<unknown>(`${SWPC}/products/solar-wind/mag-1-day.json`, 300),
    getJson<unknown>(`${SWPC}/json/f107_cm_flux.json`, 3_600),
  ]);

  const value = <T,>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
  const kpRow = latestWith(rowsFrom(value(kpRes)), ['Kp', 'kp', 'kp_index', 'estimated_kp']);
  const plasmaRow = latestWith(rowsFrom(value(plasmaRes)), ['speed']);
  const magRow = latestWith(rowsFrom(value(magRes)), ['bz_gsm', 'bz']);
  const fluxRow = latestWith(rowsFrom(value(fluxRes)), ['flux']);

  const kp = pick(kpRow, ['Kp', 'kp', 'kp_index', 'estimated_kp']);
  const data: SpaceWeather = {
    kp,
    kpObservedAt: kpRow && typeof kpRow.time_tag === 'string' ? new Date(`${kpRow.time_tag.replace(' ', 'T')}${kpRow.time_tag.endsWith('Z') ? '' : 'Z'}`).toISOString() : null,
    geomagneticLevel: geomagneticLevel(kp),
    solarWindSpeed: pick(plasmaRow, ['speed']),
    solarWindDensity: pick(plasmaRow, ['density']),
    solarWindTempK: pick(plasmaRow, ['temperature']),
    bz: pick(magRow, ['bz_gsm', 'bz']),
    bt: pick(magRow, ['bt']),
    f107: pick(fluxRow, ['flux']),
  };

  const failures = [kpRes, plasmaRes, magRes, fluxRes].filter((r) => r.status === 'rejected').length;
  if (failures === 4) {
    return {
      data: {
        kp: 2,
        kpObservedAt: null,
        geomagneticLevel: 'Quiet',
        solarWindSpeed: 420,
        solarWindDensity: 5,
        solarWindTempK: 90_000,
        bz: -1.2,
        bt: 5.1,
        f107: 150,
      },
      status: mockStatus('NOAA SWPC is unreachable. Showing typical quiet-Sun values.', false),
    };
  }
  return { data, status: liveStatus(failures ? `${failures} of 4 space-weather feeds unavailable.` : undefined) };
}

// ---------------------------------------------------------------------------
// Open-Meteo
// ---------------------------------------------------------------------------
export async function fetchWeather(now = new Date()): Promise<SourceResult<WeatherBundle>> {
  const base = process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast';
  const params = new URLSearchParams({
    latitude: String(OBSERVER.latitude),
    longitude: String(OBSERVER.longitude),
    current: OPEN_METEO_CURRENT,
    hourly: OPEN_METEO_HOURLY,
    daily: 'sunrise,sunset',
    timezone: OBSERVER.timezone,
    forecast_days: '3',
  });
  if (process.env.OPEN_METEO_API_KEY) params.set('apikey', process.env.OPEN_METEO_API_KEY);

  try {
    const json = await getJson<OpenMeteoResponse>(`${base}?${params.toString()}`, 900);
    if (!json.hourly?.time?.length) throw new Error('Open-Meteo returned no hourly data');
    return { data: buildWeatherBundle(json, OBSERVER, now), status: liveStatus() };
  } catch (e) {
    return {
      data: buildWeatherBundle(mockOpenMeteo(now), OBSERVER, now),
      status: mockStatus(`Open-Meteo is unavailable (${errorMessage(e)}). Showing a sample forecast.`, false),
    };
  }
}

// ---------------------------------------------------------------------------
// YouTube Data API — live space streams
// ---------------------------------------------------------------------------
interface YTSearchResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
    };
  }>;
}

interface YTVideosResponse {
  items?: Array<{ id: string; liveStreamingDetails?: { actualStartTime?: string; concurrentViewers?: string } }>;
}

const SPACE_TERMS =
  /\b(nasa|spacex|isro|esa|launch|rocket|space|iss|starship|orbit|orbital|astronaut|artemis|falcon|gaganyaan|lvm3|pslv|ariane|earth from)\b/i;

/** Official channel IDs used when nothing is detected live. The embed shows the channel's current stream if any. */
const CHANNEL_FALLBACKS: Array<{ id: string; channel: string; title: string }> = [
  { id: 'UCLA_DiR1FfKNvjuUpBHmylQ', channel: 'NASA', title: 'NASA live channel' },
  { id: 'UCtI0Hodo5o5dUb67FeUjDeA', channel: 'SpaceX', title: 'SpaceX live channel' },
];

function channelFallbacks(): LiveStream[] {
  return CHANNEL_FALLBACKS.map((c) => ({
    id: `channel-${c.id}`,
    videoId: null,
    title: c.title,
    channel: c.channel,
    thumbnail: null,
    embedUrl: `https://www.youtube.com/embed/live_stream?channel=${c.id}`,
    watchUrl: `https://www.youtube.com/channel/${c.id}/live`,
    startedAt: null,
    viewers: null,
    kind: 'channel-fallback',
  }));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export async function fetchLiveStreams(): Promise<SourceResult<LiveStream[]>> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { data: channelFallbacks(), status: mockStatus('Add YOUTUBE_API_KEY to detect live space streams automatically.') };
  }
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      eventType: 'live',
      type: 'video',
      q: 'NASA|SpaceX|ISRO|ESA|rocket launch|space station live',
      maxResults: '15',
      safeSearch: 'strict',
      relevanceLanguage: 'en',
      key,
    });
    const search = await getJson<YTSearchResponse>(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, 900);
    const items = (search.items ?? [])
      .filter((i) => i.id?.videoId && i.snippet?.title)
      .filter((i) => SPACE_TERMS.test(`${i.snippet?.title ?? ''} ${i.snippet?.channelTitle ?? ''}`))
      .slice(0, 8);

    if (!items.length) {
      return { data: channelFallbacks(), status: liveStatus('No space streams are live right now.') };
    }

    const ids = items.map((i) => i.id!.videoId!);
    const details = new Map<string, { startedAt: string | null; viewers: number | null }>();
    try {
      const v = await getJson<YTVideosResponse>(
        `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: 'liveStreamingDetails', id: ids.join(','), key }).toString()}`,
        300,
      );
      for (const item of v.items ?? []) {
        const viewers = item.liveStreamingDetails?.concurrentViewers;
        details.set(item.id, {
          startedAt: item.liveStreamingDetails?.actualStartTime ?? null,
          viewers: viewers ? Number(viewers) : null,
        });
      }
    } catch {
      // Viewer counts are optional.
    }

    const streams: LiveStream[] = items.map((i) => {
      const videoId = i.id!.videoId!;
      const d = details.get(videoId);
      return {
        id: videoId,
        videoId,
        title: decodeEntities(i.snippet?.title ?? 'Live stream'),
        channel: decodeEntities(i.snippet?.channelTitle ?? 'YouTube'),
        thumbnail: i.snippet?.thumbnails?.high?.url ?? i.snippet?.thumbnails?.medium?.url ?? null,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        startedAt: d?.startedAt ?? i.snippet?.publishedAt ?? null,
        viewers: d?.viewers ?? null,
        kind: 'live',
      };
    });
    streams.sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0));
    return { data: streams, status: liveStatus() };
  } catch (e) {
    return { data: channelFallbacks(), status: mockStatus(`YouTube is unavailable (${errorMessage(e)}).`, false) };
  }
}

// ---------------------------------------------------------------------------
// The Space Devs — Launch Library 2
// ---------------------------------------------------------------------------
interface LL2Launch {
  id: string;
  name: string;
  net: string;
  window_start?: string;
  status?: { name?: string; abbrev?: string };
  launch_service_provider?: { name?: string };
  rocket?: { configuration?: { name?: string; full_name?: string } };
  mission?: { name?: string; description?: string; type?: string; orbit?: { name?: string } | null } | null;
  pad?: { name?: string; location?: { name?: string } };
  image?: string | { image_url?: string; thumbnail_url?: string } | null;
  webcast_live?: boolean;
}

export function classifyAgencies(provider: string, text: string): Agency[] {
  const agencies = new Set<Agency>();
  if (/spacex/i.test(provider)) agencies.add('SpaceX');
  if (/national aeronautics|\bnasa\b/i.test(provider) || /\bNASA\b/.test(text)) agencies.add('NASA');
  if (/indian space research|\bisro\b|newspace india/i.test(provider) || /\bISRO\b/.test(text)) agencies.add('ISRO');
  if (/european space agency|arianespace/i.test(provider) || /\bESA\b/.test(text)) agencies.add('ESA');
  return agencies.size ? [...agencies] : ['Global'];
}

function parseLaunch(r: LL2Launch): Launch {
  const provider = r.launch_service_provider?.name ?? 'Unknown provider';
  const missionName = r.mission?.name ?? r.name.split('|')[1]?.trim() ?? r.name;
  const description = r.mission?.description?.trim() || null;
  const image = typeof r.image === 'string' ? r.image : (r.image?.thumbnail_url ?? r.image?.image_url ?? null);
  return {
    id: r.id,
    name: r.name,
    net: r.net,
    windowStart: r.window_start ?? r.net,
    status: r.status?.name ?? 'To be confirmed',
    statusAbbrev: r.status?.abbrev ?? 'TBC',
    provider,
    agencies: classifyAgencies(provider, `${r.name} ${missionName} ${description ?? ''}`),
    rocket: r.rocket?.configuration?.full_name ?? r.rocket?.configuration?.name ?? 'Unknown vehicle',
    missionName,
    missionType: r.mission?.type ?? null,
    missionDescription: description,
    orbit: r.mission?.orbit?.name ?? null,
    pad: r.pad?.name ?? null,
    location: r.pad?.location?.name ?? null,
    image,
    webcastLive: Boolean(r.webcast_live),
  };
}

function mockLaunches(now: Date): Launch[] {
  const hour = 3_600_000;
  const base = Math.ceil(now.getTime() / hour) * hour;
  const rows: Array<[number, string, string, string, Agency[], string, string]> = [
    [30, 'Starlink batch (simulated)', 'Falcon 9 Block 5', 'SpaceX', ['SpaceX'], 'Cape Canaveral, FL, USA', 'Low Earth Orbit'],
    [74, 'Earth observation satellite (simulated)', 'PSLV-XL', 'Indian Space Research Organization', ['ISRO'], 'Satish Dhawan Space Centre, India', 'Sun-Synchronous Orbit'],
    [130, 'Science mission (simulated)', 'Ariane 6', 'Arianespace', ['ESA'], 'Guiana Space Centre, French Guiana', 'Sun-Synchronous Orbit'],
    [190, 'ISS cargo resupply (simulated)', 'Falcon 9 Block 5', 'SpaceX', ['SpaceX', 'NASA'], 'Cape Canaveral, FL, USA', 'Low Earth Orbit'],
  ];
  return rows.map(([h, mission, rocket, provider, agencies, location, orbit], i) => ({
    id: `mock-launch-${i}`,
    name: `${rocket} | ${mission}`,
    net: new Date(base + h * hour).toISOString(),
    windowStart: new Date(base + h * hour).toISOString(),
    status: 'To be confirmed',
    statusAbbrev: 'TBC',
    provider,
    agencies,
    rocket,
    missionName: mission,
    missionType: null,
    missionDescription: 'Simulated launch shown because Launch Library 2 could not be reached.',
    orbit,
    pad: null,
    location,
    image: null,
    webcastLive: false,
  }));
}

export async function fetchLaunches(now = new Date()): Promise<SourceResult<Launch[]>> {
  const base = process.env.LAUNCH_LIBRARY_URL || 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/';
  const url = `${base}${base.includes('?') ? '&' : '?'}${new URLSearchParams({ limit: '40', mode: 'normal' }).toString()}`;
  const headers: Record<string, string> = process.env.LAUNCH_LIBRARY_TOKEN
    ? { Authorization: `Token ${process.env.LAUNCH_LIBRARY_TOKEN}` }
    : {};
  try {
    const json = await getJson<{ results?: LL2Launch[] }>(url, 1_800, headers);
    const all = (json.results ?? [])
      .map(parseLaunch)
      .filter((l) => Date.parse(l.net) > now.getTime() - 6 * 3_600_000);
    const tracked = all.filter((l) => !l.agencies.includes('Global'));
    const others = all.filter((l) => l.agencies.includes('Global'));
    const data = [...tracked, ...others.slice(0, Math.max(0, 12 - tracked.length))].sort(
      (a, b) => Date.parse(a.net) - Date.parse(b.net),
    );
    return { data, status: liveStatus() };
  } catch (e) {
    return { data: mockLaunches(now), status: mockStatus(`Launch Library is unavailable (${errorMessage(e)}).`, false) };
  }
}
