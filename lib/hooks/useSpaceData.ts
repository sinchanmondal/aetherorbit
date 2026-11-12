'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpaceDataResponse } from '@/lib/types';

const FAST_POLL_MS = 60_000; // satellites + space weather
const SLOW_POLL_MS = 15 * 60_000; // everything else

function merge(prev: SpaceDataResponse | null, next: SpaceDataResponse): SpaceDataResponse {
  if (!prev) return next;
  return { ...prev, ...next, sources: { ...prev.sources, ...next.sources } };
}

/**
 * Loads /api/space-data once, then refreshes satellites every minute and the
 * slower feeds every 15 minutes. Polling pauses while the tab is hidden.
 */
export function useSpaceData(category: number) {
  const [data, setData] = useState<SpaceDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [satellitesLoading, setSatellitesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryRef = useRef(category);
  const firstCategory = useRef(true);

  const request = useCallback(async (include?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ category: String(categoryRef.current) });
    if (include) params.set('include', include);
    const res = await fetch(`/api/space-data?${params.toString()}`, { signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`The space data service returned ${res.status}.`);
    return (await res.json()) as SpaceDataResponse;
  }, []);

  // Initial full load
  useEffect(() => {
    const controller = new AbortController();
    request(undefined, controller.signal)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load space data.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request]);

  // Satellite group change
  useEffect(() => {
    categoryRef.current = category;
    if (firstCategory.current) {
      firstCategory.current = false;
      return;
    }
    const controller = new AbortController();
    setSatellitesLoading(true);
    request('satellites', controller.signal)
      .then((d) => setData((prev) => merge(prev, d)))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setSatellitesLoading(false);
      });
    return () => controller.abort();
  }, [category, request]);

  // Polling
  useEffect(() => {
    const poll = (include?: string) => {
      if (document.visibilityState !== 'visible') return;
      request(include)
        .then((d) => {
          setData((prev) => merge(prev, d));
          setError(null);
        })
        .catch(() => undefined);
    };
    const fast = window.setInterval(() => poll('satellites,spaceWeather'), FAST_POLL_MS);
    const slow = window.setInterval(() => poll('passes,weather,streams,launches'), SLOW_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll('satellites,spaceWeather');
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(fast);
      window.clearInterval(slow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [request]);

  return { data, loading, satellitesLoading, error };
}
