'use client';

import { useEffect, useState } from 'react';

/**
 * Current time in ms, refreshed on an interval. Returns null during server
 * rendering and the first client render, which avoids hydration mismatches.
 */
export function useNow(intervalMs = 1_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
