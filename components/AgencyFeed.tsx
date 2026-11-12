'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellPlus, BellRing, ExternalLink, Play, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { countdown, formatCompact, formatDate, formatTime } from '@/lib/format';
import { useNow } from '@/lib/hooks/useNow';
import { isReminderActive, useAppStore } from '@/lib/store';
import type { Agency, Launch, LiveStream, Mission, SourceStatus } from '@/lib/types';
import { AgencyTag, Button, SectionHeader, Skeleton, SourceNote, agencyDotClass } from './ui';

type AgencyFilter = 'All' | Exclude<Agency, 'Global'>;
const FILTERS: AgencyFilter[] = ['All', 'NASA', 'ISRO', 'SpaceX', 'ESA'];

interface AgencyFeedProps {
  launches: Launch[];
  missions: Mission[];
  streams: LiveStream[];
  launchesStatus?: SourceStatus;
  streamsStatus?: SourceStatus;
  loading: boolean;
}

function Countdown({ target, className }: { target: string; className?: string }) {
  const now = useNow(1_000);
  return (
    <span className={clsx('tabular', className)} aria-label={now ? `Time to launch ${countdown(Date.parse(target), now)}` : undefined}>
      {now ? countdown(Date.parse(target), now) : 'T− --:--:--'}
    </span>
  );
}

function statusTone(abbrev: string) {
  const a = abbrev.toLowerCase();
  if (a === 'go' || a === 'success' || a === 'in flight') return 'text-ion ring-ion/40';
  if (a === 'hold' || a === 'tbd' || a === 'tbc') return 'text-flare ring-flare/40';
  if (a === 'failure' || a === 'partial failure') return 'text-ember ring-ember/40';
  return 'text-dust ring-white/15';
}

// ---------------------------------------------------------------------------
// Live player with a click-to-load facade (keeps the page fast)
// ---------------------------------------------------------------------------
function LivePlayer({ stream }: { stream: LiveStream | null }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => setPlaying(false), [stream?.id]);

  if (!stream) {
    return (
      <div className="grid aspect-video place-items-center rounded-[24px] bg-black/40 ring-1 ring-white/10">
        <p className="text-dust">No stream selected.</p>
      </div>
    );
  }

  const src = `${stream.embedUrl}${stream.embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div className="relative aspect-video overflow-hidden rounded-[24px] bg-black/60 ring-1 ring-white/10">
      {playing ? (
        <iframe
          key={stream.id}
          src={src}
          title={stream.title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 text-left"
          aria-label={`Play ${stream.title}`}
        >
          {stream.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stream.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-85" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(139,124,246,0.35),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(92,225,230,0.25),transparent_50%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
          <span className="absolute left-1/2 top-[38%] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center sm:top-1/2 sm:h-16 sm:w-16 rounded-full bg-ion text-void shadow-[0_0_40px_-4px_rgba(92,225,230,0.9)] transition-transform group-hover:scale-105">
            <Play className="ml-1 h-5 w-5 fill-current sm:h-6 sm:w-6" />
          </span>
          <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            {stream.kind === 'live' ? (
              <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-ember/90 px-2.5 py-0.5 text-xs font-semibold text-void">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-void" /> Live
                {stream.viewers ? <span className="font-normal">{formatCompact(stream.viewers)} watching</span> : null}
              </span>
            ) : (
              <span className="mb-2 hidden rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-starlight sm:inline-block">
                Channel feed, shows a stream if one is on air
              </span>
            )}
            <span className="line-clamp-2 block font-display text-xl font-medium leading-tight text-starlight sm:text-3xl">{stream.title}</span>
            <span className="mt-1 block text-sm text-dust">{stream.channel}</span>
          </span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AgencyFeed({ launches, missions, streams, launchesStatus, streamsStatus, loading }: AgencyFeedProps) {
  const [filter, setFilter] = useState<AgencyFilter>('All');
  const [streamId, setStreamId] = useState<string | null>(null);
  const reminders = useAppStore((s) => s.reminders);
  const addReminder = useAppStore((s) => s.addReminder);
  const openExplain = useAppStore((s) => s.openExplain);

  const activeStream = streams.find((s) => s.id === streamId) ?? streams[0] ?? null;
  const hasLive = streams.some((s) => s.kind === 'live');

  const visibleLaunches = useMemo(
    () => (filter === 'All' ? launches : launches.filter((l) => l.agencies.includes(filter))),
    [launches, filter],
  );
  const visibleMissions = useMemo(
    () => (filter === 'All' ? missions : missions.filter((m) => m.agency === filter)),
    [missions, filter],
  );
  const next = visibleLaunches[0] ?? null;
  const manifest = visibleLaunches.slice(next ? 1 : 0, 13);

  const explainLaunch = (l: Launch) =>
    openExplain({
      type: 'launch',
      name: l.missionName,
      context: {
        fullName: l.name,
        rocket: l.rocket,
        provider: l.provider,
        agencies: l.agencies.join(', '),
        launchTimeUtc: l.net,
        status: l.status,
        orbit: l.orbit,
        missionType: l.missionType,
        pad: l.pad,
        location: l.location,
        description: l.missionDescription?.slice(0, 900) ?? null,
      },
    });

  const remindLaunch = (l: Launch) =>
    addReminder({
      kind: 'launch',
      targetRef: l.id,
      label: l.missionName,
      eventAt: l.net,
      metadata: { rocket: l.rocket, provider: l.provider },
    });

  const filterControl = (
    <div role="radiogroup" aria-label="Filter by agency" className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={filter === f}
          onClick={() => setFilter(f)}
          className={clsx(
            'relative h-8 rounded-full px-3.5 text-sm transition-colors',
            filter === f ? 'text-void' : 'text-dust hover:text-starlight',
          )}
        >
          {filter === f ? (
            <motion.span layoutId="agency-filter" className="absolute inset-0 rounded-full bg-starlight" transition={{ duration: 0.25 }} />
          ) : null}
          <span className="relative">{f}</span>
        </button>
      ))}
    </div>
  );

  return (
    <section id="launches" aria-labelledby="launches-title" className="py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeader
          id="launches-title"
          title="Launches and live coverage"
          description="Upcoming flights from NASA, ISRO, SpaceX and ESA, the missions they are flying now, and any space broadcast that is live on YouTube."
          aside={filterControl}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Player */}
          <div className="min-w-0 lg:col-span-8">
            <LivePlayer stream={activeStream} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-dust">
                {hasLive ? `${streams.filter((s) => s.kind === 'live').length} space streams live now` : 'Nothing is broadcasting live right now.'}
              </p>
              {activeStream ? (
                <a
                  href={activeStream.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-dust hover:text-starlight"
                >
                  Open on YouTube <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            {streams.length > 1 ? (
              <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {streams.map((s) => (
                  <li key={s.id} className="w-56 flex-none">
                    <button
                      type="button"
                      onClick={() => setStreamId(s.id)}
                      aria-pressed={activeStream?.id === s.id}
                      className={clsx(
                        'w-full rounded-2xl p-2 text-left transition-colors',
                        activeStream?.id === s.id ? 'bg-ion/[0.08] ring-1 ring-ion/40' : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="relative block aspect-video overflow-hidden rounded-xl bg-hull">
                        {s.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full place-items-center font-display text-xl text-starlight">{s.channel}</span>
                        )}
                        {s.kind === 'live' ? (
                          <span className="absolute left-2 top-2 rounded-full bg-ember px-2 py-0.5 text-[11px] font-semibold text-void">Live</span>
                        ) : null}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-sm text-starlight">{s.title}</span>
                      <span className="block text-xs text-dust">{s.channel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <SourceNote status={streamsStatus} className="mt-2" />
          </div>

          {/* Next launch */}
          <div className="glass flex flex-col rounded-[32px] p-6 sm:p-8 lg:col-span-4">
            <p className="text-sm text-dust">Next launch{filter !== 'All' ? ` for ${filter}` : ''}</p>
            {loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : next ? (
              <>
                <h3 className="mt-2 font-display text-[2.2rem] font-medium leading-[1.05] text-starlight">{next.missionName}</h3>
                <Countdown target={next.net} className="mt-4 block font-display text-5xl font-medium text-ion" />
                <p className="mt-2 text-dust tabular">
                  {formatDate(next.net, { weekday: 'long', day: 'numeric', month: 'long' })}, {formatTime(next.net)} IST
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {next.agencies.map((a) => (
                    <AgencyTag key={a} agency={a} />
                  ))}
                  <span className={clsx('rounded-full px-2.5 py-0.5 text-xs ring-1', statusTone(next.statusAbbrev))}>{next.status}</span>
                </div>
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-dust">Rocket</dt>
                    <dd className="text-right text-starlight">{next.rocket}</dd>
                  </div>
                  {next.orbit ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-dust">Orbit</dt>
                      <dd className="text-right text-starlight">{next.orbit}</dd>
                    </div>
                  ) : null}
                  {next.location ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-dust">From</dt>
                      <dd className="text-right text-starlight">{next.location}</dd>
                    </div>
                  ) : null}
                </dl>
                {next.missionDescription ? (
                  <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-dust">{next.missionDescription}</p>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <Button variant="primary" size="sm" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => explainLaunch(next)}>
                    Explain with AI
                  </Button>
                  {isReminderActive(reminders, 'launch', next.id) ? (
                    <Button size="sm" variant="quiet" disabled icon={<BellRing className="h-3.5 w-3.5 text-ion" />}>
                      Reminder set
                    </Button>
                  ) : (
                    <Button size="sm" icon={<BellPlus className="h-3.5 w-3.5" />} onClick={() => remindLaunch(next)}>
                      Remind me
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-dust">No upcoming {filter === 'All' ? '' : `${filter} `}launches are scheduled in the current manifest.</p>
            )}
          </div>
        </div>

        {/* Manifest — launches are a real sequence, so they read as a timeline */}
        <div className="glass mt-6 rounded-[24px] p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-2xl font-medium text-starlight">Launch manifest</h3>
            <SourceNote status={launchesStatus} />
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.ol key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 divide-y divide-white/[0.06]">
              {manifest.length === 0 && !loading ? (
                <li className="py-6 text-dust">Nothing further scheduled for this filter yet.</li>
              ) : null}
              {manifest.map((l) => {
                const set = isReminderActive(reminders, 'launch', l.id);
                return (
                  <li key={l.id} className="grid gap-3 py-5 md:grid-cols-[9.5rem_minmax(0,1fr)_auto] md:items-center">
                    <div className="tabular">
                      <p className="text-starlight">{formatDate(l.net, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="text-sm text-dust">{formatTime(l.net)} IST</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {l.agencies.map((a) => (
                          <AgencyTag key={a} agency={a} />
                        ))}
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs ring-1', statusTone(l.statusAbbrev))}>{l.status}</span>
                        {l.webcastLive ? <span className="text-xs font-semibold text-ember">Webcast live</span> : null}
                      </div>
                      <p className="mt-1.5 truncate text-lg text-starlight">{l.missionName}</p>
                      <p className="truncate text-sm text-dust">
                        {l.rocket}, {l.provider}
                        {l.location ? `, ${l.location}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Countdown target={l.net} className="mr-2 text-sm text-ion" />
                      <Button size="sm" variant="quiet" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => explainLaunch(l)}>
                        Explain
                      </Button>
                      <Button
                        size="sm"
                        variant={set ? 'quiet' : 'ghost'}
                        disabled={set}
                        icon={set ? <BellRing className="h-3.5 w-3.5 text-ion" /> : <BellPlus className="h-3.5 w-3.5" />}
                        onClick={() => remindLaunch(l)}
                      >
                        {set ? 'Set' : 'Remind me'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </motion.ol>
          </AnimatePresence>
        </div>

        {/* Missions */}
        <div className="mt-6">
          <h3 className="font-display text-2xl font-medium text-starlight">Missions in flight</h3>
          <ul className="mt-4 grid gap-x-10 border-t hairline md:grid-cols-2">
            {visibleMissions.map((m) => (
              <li key={m.id} className="border-b hairline py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm text-dust">
                      <span className={clsx('h-1.5 w-1.5 rounded-full', agencyDotClass(m.agency))} />
                      {m.agency}, {m.kind.toLowerCase()}
                      {m.launched ? `, launched ${formatDate(m.launched, { month: 'short', year: 'numeric' })}` : ''}
                    </p>
                    <p className="mt-1 text-lg text-starlight">{m.name}</p>
                    <p className="text-sm text-ion/90">{m.status}</p>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-dust">{m.summary}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="quiet"
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    onClick={() =>
                      openExplain({
                        type: 'mission',
                        name: m.name,
                        context: {
                          agency: m.agency,
                          kind: m.kind,
                          phase: m.phase,
                          status: m.status,
                          launched: m.launched,
                          destination: m.destination,
                          summary: m.summary,
                        },
                      })
                    }
                  >
                    Explain
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-dust/80">Mission statuses are curated. Launch times update live and often slip.</p>
        </div>
      </div>
    </section>
  );
}
