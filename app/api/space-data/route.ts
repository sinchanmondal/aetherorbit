import { NextResponse, type NextRequest } from 'next/server';
import { upcomingCelestialEvents } from '@/lib/celestial';
import { ISS_NORAD_ID, OBSERVER } from '@/lib/config';
import { MISSIONS } from '@/lib/data/missions';
import { enrichSatellite } from '@/lib/satellites';
import {
  fetchLaunches,
  fetchLiveStreams,
  fetchSatellitesAbove,
  fetchSpaceWeather,
  fetchVisualPasses,
  fetchWeather,
} from '@/lib/server/sources';
import type { SourceKey, SpaceDataResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALL_SOURCES: SourceKey[] = ['satellites', 'passes', 'spaceWeather', 'weather', 'streams', 'launches'];

/** N2YO category ids exposed in the UI (0 = all objects, 1 = brightest, 2 = ISS, ...) */
const ALLOWED_CATEGORIES = new Set([0, 1, 2, 3, 26, 32, 46, 52]);
const MAX_SATELLITES = 60;

/**
 * GET /api/space-data?include=satellites,weather&category=1
 *
 * Fetches and merges every live feed the dashboard needs. `include` limits
 * the work to specific sources (the client polls satellites every minute but
 * weather and streams far less often). Each source reports its own status so
 * the UI can say exactly which data is simulated.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requested = params.get('include');
  const include = new Set<SourceKey>(
    requested
      ? requested
          .split(',')
          .map((s) => s.trim())
          .filter((s): s is SourceKey => (ALL_SOURCES as string[]).includes(s))
      : ALL_SOURCES,
  );
  const rawCategory = Number(params.get('category') ?? 1);
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 1;
  const now = new Date();

  // Satellite enrichment uses space weather (Kp, F10.7) for thermosphere estimates.
  const needsSpaceWeather = include.has('spaceWeather') || include.has('satellites');

  const [spaceWeather, satellites, passes, weather, streams, launches] = await Promise.all([
    needsSpaceWeather ? fetchSpaceWeather() : null,
    include.has('satellites') ? fetchSatellitesAbove(category, now) : null,
    include.has('passes') ? fetchVisualPasses(ISS_NORAD_ID, 'ISS (ZARYA)', 7, 120) : null,
    include.has('weather') ? fetchWeather(now) : null,
    include.has('streams') ? fetchLiveStreams() : null,
    include.has('launches') ? fetchLaunches(now) : null,
  ]);

  const body: SpaceDataResponse = {
    generatedAt: now.toISOString(),
    observer: OBSERVER,
    sources: {},
  };

  if (spaceWeather && include.has('spaceWeather')) {
    body.spaceWeather = spaceWeather.data;
    body.sources.spaceWeather = spaceWeather.status;
  }

  if (satellites) {
    const items = satellites.data
      .map((raw) => enrichSatellite(raw, OBSERVER, spaceWeather?.data ?? null, now))
      .filter((s) => s.elevation > -1)
      .sort((a, b) => Number(b.profile.featured) - Number(a.profile.featured) || b.elevation - a.elevation);
    body.satellites = { items: items.slice(0, MAX_SATELLITES), category, total: items.length };
    body.sources.satellites = satellites.status;
  }

  if (passes) {
    body.issPasses = passes.data.slice(0, 6);
    body.sources.passes = passes.status;
  }

  if (weather) {
    body.weather = weather.data;
    body.celestialEvents = upcomingCelestialEvents(now, 60);
    body.sources.weather = weather.status;
  }

  if (streams) {
    body.liveStreams = streams.data;
    body.sources.streams = streams.status;
  }

  if (launches) {
    body.launches = launches.data;
    body.missions = MISSIONS;
    body.sources.launches = launches.status;
  }

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
