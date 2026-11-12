'use client';

import { MotionConfig, motion } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import AIExplainPanel from '@/components/AIExplainPanel';
import AgencyFeed from '@/components/AgencyFeed';
import AuthModal from '@/components/AuthModal';
import ConstellationGallery from '@/components/ConstellationGallery';
import MysteryData from '@/components/MysteryData';
import Navbar from '@/components/Navbar';
import ReminderCenter from '@/components/ReminderCenter';
import SatelliteTracker from '@/components/SatelliteTracker';
import StargazingPlanner from '@/components/StargazingPlanner';
import Starfield from '@/components/Starfield';
import Toaster from '@/components/Toaster';
import { OBSERVER, OBSERVER_SHORT_NAME } from '@/lib/config';
import { useAuthBootstrap } from '@/lib/hooks/useAuthBootstrap';
import { useNow } from '@/lib/hooks/useNow';
import { useSpaceData } from '@/lib/hooks/useSpaceData';
import { useAppStore } from '@/lib/store';

function humanizeUntil(targetMs: number, nowMs: number): string {
  const minutes = Math.max(0, Math.round((targetMs - nowMs) / 60_000));
  if (minutes < 1) return 'any moment now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const m = minutes % 60;
    return `${hours} hour${hours === 1 ? '' : 's'}${m ? ` ${m} min` : ''}`;
  }
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return `${days} day${days === 1 ? '' : 's'}${h ? ` ${h} hour${h === 1 ? '' : 's'}` : ''}`;
}

/** Values in the hero sentence carry the data, so they get the brighter colour. */
function Value({ children }: { children: ReactNode }) {
  return <span className="text-starlight tabular">{children}</span>;
}

export default function HomePage() {
  useAuthBootstrap();
  const notify = useAppStore((s) => s.notify);
  const [category, setCategory] = useState(1);
  const { data, loading, satellitesLoading, error } = useSpaceData(category);
  const now = useNow(30_000);

  // Surface a failed email-link sign-in (redirected here by /auth/callback)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('auth_error')) {
      notify('That sign-in link has expired or was already used. Request a new one.', 'error');
      url.searchParams.delete('auth_error');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, [notify]);

  const satellites = data?.satellites?.items ?? [];
  const overhead = satellites.filter((s) => s.elevation >= 0);
  const sunlit = overhead.filter((s) => s.sunlit).length;
  const report = data?.weather?.stargazing ?? null;
  const nextLaunch = useMemo(
    () => (data?.launches ?? []).find((l) => !l.agencies.includes('Global') && Date.parse(l.net) > (now ?? 0)) ?? null,
    [data?.launches, now],
  );

  return (
    <MotionConfig reducedMotion="user">
      <Starfield />
      <div className="relative z-10" id="top">
        <a
          href="#sky"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-ion focus:px-4 focus:py-2 focus:text-void"
        >
          Skip to the live sky
        </a>
        <Navbar />

        <main>
          {/* Hero: the headline, then straight into the live sky dome */}
          <header className="mx-auto max-w-[1400px] px-5 pb-12 pt-32 lg:px-10 lg:pb-16 lg:pt-40">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-dust tabular"
            >
              {OBSERVER.name}, {OBSERVER.latitude.toFixed(2)}° N {OBSERVER.longitude.toFixed(2)}° E
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 max-w-5xl font-display text-[clamp(3rem,8vw,7.25rem)] font-medium leading-[0.95] tracking-[-0.015em] text-starlight"
            >
              The sky over {OBSERVER_SHORT_NAME}, right now.
            </motion.h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-dust sm:text-xl" aria-live="polite">
              {loading ? (
                'Reading the sky…'
              ) : error && !data ? (
                <span className="text-flare">{error} Reload the page to try again.</span>
              ) : (
                <>
                  <Value>{overhead.length}</Value> satellites are above the horizon, <Value>{sunlit}</Value> of them catching
                  sunlight.{' '}
                  {report ? (
                    <>
                      Tonight&apos;s viewing score is <Value>{report.score}</Value>, which is{' '}
                      <Value>{report.rating.toLowerCase()}</Value>.{' '}
                    </>
                  ) : null}
                  {nextLaunch && now ? (
                    <>
                      The next {nextLaunch.agencies[0]} launch, <Value>{nextLaunch.missionName}</Value>, is due in{' '}
                      <Value>{humanizeUntil(Date.parse(nextLaunch.net), now)}</Value>.
                    </>
                  ) : null}
                </>
              )}
            </p>
          </header>

          <SatelliteTracker
            satellites={satellites}
            category={category}
            onCategoryChange={setCategory}
            loading={loading}
            refreshing={satellitesLoading}
            status={data?.sources.satellites}
            passes={data?.issPasses ?? []}
            passesStatus={data?.sources.passes}
            spaceWeather={data?.spaceWeather ?? null}
            updatedAt={data?.generatedAt ?? null}
          />

          <StargazingPlanner
            weather={data?.weather ?? null}
            events={data?.celestialEvents ?? []}
            status={data?.sources.weather}
            loading={loading}
          />

          <AgencyFeed
            launches={data?.launches ?? []}
            missions={data?.missions ?? []}
            streams={data?.liveStreams ?? []}
            launchesStatus={data?.sources.launches}
            streamsStatus={data?.sources.streams}
            loading={loading}
          />

          <ConstellationGallery />

          <MysteryData />
        </main>

        <footer className="border-t hairline">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-12 text-sm text-dust lg:grid-cols-12 lg:px-10">
            <div className="lg:col-span-5">
              <p className="font-display text-2xl text-starlight">AetherOrbit</p>
              <p className="mt-2 max-w-prose leading-relaxed">
                Built for the sky over {OBSERVER.name}. Satellite positions refresh every minute; temperatures and the viewing
                score are model estimates, and launch times often slip.
              </p>
            </div>
            <div className="leading-relaxed lg:col-span-7">
              <p className="text-starlight">Data sources</p>
              <p className="mt-2">
                Satellite positions and passes from N2YO. Space weather from NOAA&apos;s Space Weather Prediction Center.
                Forecasts from Open-Meteo. Launches from The Space Devs Launch Library 2. Live video from YouTube. Imagery
                from the NASA Image and Video Library and Astronomy Picture of the Day. Explanations generated with OpenAI.
              </p>
            </div>
          </div>
        </footer>
      </div>

      <AIExplainPanel />
      <AuthModal />
      <ReminderCenter />
      <Toaster />
    </MotionConfig>
  );
}
