'use client';

import { motion } from 'framer-motion';
import { BellPlus, BellRing, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useId } from 'react';
import { OBSERVER_SHORT_NAME } from '@/lib/config';
import { formatDate, formatNumber, formatTime, relativeDay } from '@/lib/format';
import { useNow } from '@/lib/hooks/useNow';
import { isReminderActive, useAppStore } from '@/lib/store';
import type { CelestialEvent, HourlyCondition, MoonInfo, SourceStatus, StargazingReport, WeatherBundle } from '@/lib/types';
import { Button, SectionHeader, Skeleton, SourceNote } from './ui';

interface StargazingPlannerProps {
  weather: WeatherBundle | null;
  events: CelestialEvent[];
  status?: SourceStatus;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Score gauge — a 270° arc
// ---------------------------------------------------------------------------
function ScoreGauge({ score, rating }: { score: number; rating: string }) {
  const gradientId = `gauge-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const size = 240;
  const r = 100;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const filled = arc * (Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#8B7CF6" />
            <stop offset="1" stopColor="#5CE1E6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E8ECF5"
          strokeOpacity="0.08"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${filled} ${c}` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ filter: 'drop-shadow(0 0 10px rgba(92,225,230,0.45))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-7xl font-medium leading-none text-starlight tabular">{score}</span>
        <span className="mt-2 text-lg text-ion">{rating}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hourly timeline
// ---------------------------------------------------------------------------
function barClass(score: number) {
  if (score >= 65) return 'bg-ion shadow-[0_0_14px_-2px_rgba(92,225,230,0.7)]';
  if (score >= 40) return 'bg-nebula';
  return 'bg-dust/40';
}

function HourlyTimeline({ hours, best }: { hours: HourlyCondition[]; best: StargazingReport['bestWindow'] }) {
  const bestStart = best ? Date.parse(best.start) : -1;
  const bestEnd = best ? Date.parse(best.end) : -1;

  return (
    <div>
      <div className="flex h-48 items-end gap-[3px]" role="list" aria-label="Viewing score by hour">
        {hours.map((h) => {
          const t = Date.parse(h.time);
          const inBest = t >= bestStart && t < bestEnd;
          const label = `${formatTime(h.time)}: score ${h.score}, cloud ${h.cloudCover}%, ${h.isDark ? 'dark' : 'twilight or daylight'}`;
          return (
            <div key={h.time} role="listitem" aria-label={label} title={label} className="relative flex h-full flex-1 flex-col justify-end">
              {inBest ? <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 rounded-full bg-ion" /> : null}
              <div
                className={clsx(
                  'absolute inset-x-0 bottom-0 top-3 rounded-md',
                  h.isDark ? 'bg-white/[0.035]' : 'bg-transparent',
                  inBest && 'ring-1 ring-ion/40',
                )}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(3, h.score)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={clsx('relative mx-[2px] rounded-t-[4px]', barClass(h.score), !h.isDark && 'opacity-40')}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px] text-xs text-dust tabular" aria-hidden>
        {hours.map((h, i) => (
          <span key={h.time} className="flex-1 text-center">
            {i % 2 === 0 ? formatTime(h.time, { minute: undefined }) : ''}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-dust">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-white/[0.08]" /> Dark sky (Sun 12° below horizon)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full bg-ion" /> Best two hours
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moon phase drawing
// ---------------------------------------------------------------------------
function MoonGlyph({ moon, size = 88 }: { moon: MoonInfo; size?: number }) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const waxing = moon.phase < 0.5;
  const crescent = moon.illumination < 0.5;
  const terminatorRx = Math.abs(Math.cos(2 * Math.PI * moon.phase)) * r;
  const firstSweep = waxing ? 1 : 0;
  const terminatorSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const lit =
    moon.illumination < 0.01
      ? ''
      : `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${firstSweep} ${cx} ${cy + r} A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r} Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="#151A2C" stroke="#E8ECF5" strokeOpacity="0.12" />
      {moon.illumination > 0.99 ? (
        <circle cx={cx} cy={cy} r={r} fill="#E8ECF5" style={{ filter: 'drop-shadow(0 0 12px rgba(232,236,245,0.45))' }} />
      ) : lit ? (
        <path d={lit} fill="#E8ECF5" style={{ filter: 'drop-shadow(0 0 12px rgba(232,236,245,0.35))' }} />
      ) : null}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function StargazingPlanner({ weather, events, status, loading }: StargazingPlannerProps) {
  const now = useNow(60_000);
  const reminders = useAppStore((s) => s.reminders);
  const addReminder = useAppStore((s) => s.addReminder);
  const openExplain = useAppStore((s) => s.openExplain);

  const report = weather?.stargazing ?? null;
  const moon = weather?.moon ?? null;
  const current = weather?.now ?? null;

  return (
    <section id="tonight" aria-labelledby="tonight-title" className="py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeader
          id="tonight-title"
          title="Tonight's sky"
          description={`A viewing score for the dark hours ahead in ${OBSERVER_SHORT_NAME}, built from Open-Meteo's cloud, humidity, visibility and rain forecasts together with the Moon's phase.`}
          aside={<SourceNote status={status} />}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Score */}
          <div className="glass flex flex-col rounded-[32px] p-6 sm:p-8 lg:col-span-4">
            {loading || !report ? (
              <div className="space-y-4">
                <Skeleton className="mx-auto aspect-square w-full max-w-[240px] rounded-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <>
                <ScoreGauge score={report.score} rating={report.rating} />
                <p className="mt-6 text-center text-lg leading-relaxed text-starlight">{report.summary}</p>
                {report.bestWindow ? (
                  <p className="mt-3 text-center text-dust tabular">
                    Best between {formatTime(report.bestWindow.start)} and {formatTime(report.bestWindow.end)} (score{' '}
                    {report.bestWindow.score})
                  </p>
                ) : null}
                <dl className="mt-auto grid grid-cols-2 gap-4 border-t hairline pt-6 text-sm">
                  <div>
                    <dt className="text-dust">Sunset</dt>
                    <dd className="text-starlight tabular">{report.sunset ? formatTime(report.sunset) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-dust">Sunrise</dt>
                    <dd className="text-starlight tabular">{report.sunrise ? formatTime(report.sunrise) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-dust">Dark from</dt>
                    <dd className="text-starlight tabular">{report.darkStart ? formatTime(report.darkStart) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-dust">Dark until</dt>
                    <dd className="text-starlight tabular">{report.darkEnd ? formatTime(report.darkEnd) : '—'}</dd>
                  </div>
                </dl>
              </>
            )}
          </div>

          {/* Timeline + factors */}
          <div className="glass rounded-[32px] p-6 sm:p-8 lg:col-span-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-2xl font-medium text-starlight">Hour by hour</h3>
              <p className="text-sm text-dust">Times in IST</p>
            </div>
            <div className="mt-6">
              {loading || !report ? <Skeleton className="h-56 w-full" /> : <HourlyTimeline hours={report.hours} best={report.bestWindow} />}
            </div>

            <div className="mt-8 grid gap-x-6 gap-y-5 border-t hairline pt-6 sm:grid-cols-3 lg:grid-cols-5">
              {(report?.factors ?? []).map((f) => (
                <div key={f.key}>
                  <p className="text-sm text-dust">{f.label}</p>
                  <p className="mt-0.5 text-lg text-starlight tabular">{f.value}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                    <div className="h-full rounded-full bg-gradient-to-r from-nebula to-ion" style={{ width: `${f.score}%` }} />
                  </div>
                  <p className="sr-only">{`${f.label} contributes ${f.score} out of 100.`}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Conditions + Moon */}
          <div className="grid gap-6 lg:col-span-4">
            <div className="glass rounded-[24px] p-6">
              <h3 className="font-display text-2xl font-medium text-starlight">Right now</h3>
              {current ? (
                <>
                  <p className="mt-1 text-dust">{current.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-dust">Temperature</dt>
                      <dd className="text-lg text-starlight tabular">{formatNumber(current.temperatureC, 1)}°C</dd>
                    </div>
                    <div>
                      <dt className="text-dust">Humidity</dt>
                      <dd className="text-lg text-starlight tabular">{Math.round(current.humidity)}%</dd>
                    </div>
                    <div>
                      <dt className="text-dust">Cloud</dt>
                      <dd className="text-lg text-starlight tabular">{Math.round(current.cloudCover)}%</dd>
                    </div>
                    <div>
                      <dt className="text-dust">Visibility</dt>
                      <dd className="text-lg text-starlight tabular">{formatNumber(current.visibilityM / 1000, 1)} km</dd>
                    </div>
                    <div>
                      <dt className="text-dust">Wind</dt>
                      <dd className="text-lg text-starlight tabular">{formatNumber(current.windKmh)} km/h</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <Skeleton className="mt-4 h-28 w-full" />
              )}
            </div>

            <div className="glass flex items-center gap-5 rounded-[24px] p-6">
              {moon ? (
                <>
                  <MoonGlyph moon={moon} />
                  <div>
                    <h3 className="font-display text-2xl font-medium text-starlight">{moon.phaseName}</h3>
                    <p className="text-dust tabular">
                      {Math.round(moon.illumination * 100)}% lit, {moon.ageDays.toFixed(1)} days old
                    </p>
                    <p className="mt-2 text-sm text-dust tabular">
                      Full {formatDate(moon.nextFull, { day: 'numeric', month: 'short' })}, new{' '}
                      {formatDate(moon.nextNew, { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </>
              ) : (
                <Skeleton className="h-24 w-full" />
              )}
            </div>
          </div>

          {/* Events */}
          <div className="glass rounded-[24px] p-6 sm:p-8 lg:col-span-8">
            <h3 className="font-display text-2xl font-medium text-starlight">Coming up in the sky</h3>
            <p className="mt-1 text-sm text-dust">The next two months. Dates are typical peaks and can shift by a day.</p>
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {events.length === 0 && loading
                ? Array.from({ length: 3 }, (_, i) => (
                    <li key={i} className="py-4">
                      <Skeleton className="h-12 w-full" />
                    </li>
                  ))
                : events.slice(0, 6).map((e) => {
                    const set = isReminderActive(reminders, 'celestial_event', e.id);
                    return (
                      <li key={e.id} className="grid gap-3 py-5 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:items-start">
                        <p className="text-starlight tabular">
                          {now ? relativeDay(e.date, now) : formatDate(e.date)}
                          <span className="block text-sm text-dust">
                            {e.type === 'meteor-shower' ? 'Meteor shower' : e.type === 'moon' ? 'Moon' : 'Season'}
                          </span>
                        </p>
                        <div className="min-w-0">
                          <p className="text-lg text-starlight">{e.title}</p>
                          <p className="mt-1 max-w-prose text-sm leading-relaxed text-dust">
                            {e.description} {e.viewingTip}
                          </p>
                        </div>
                        <div className="flex gap-2 sm:flex-col sm:items-end">
                          <Button
                            size="sm"
                            variant={set ? 'quiet' : 'ghost'}
                            disabled={set}
                            icon={set ? <BellRing className="h-3.5 w-3.5 text-ion" /> : <BellPlus className="h-3.5 w-3.5" />}
                            onClick={() =>
                              addReminder({ kind: 'celestial_event', targetRef: e.id, label: e.title, eventAt: e.date })
                            }
                          >
                            {set ? 'Reminder set' : 'Remind me'}
                          </Button>
                          <Button
                            size="sm"
                            variant="quiet"
                            icon={<Sparkles className="h-3.5 w-3.5" />}
                            onClick={() =>
                              openExplain({
                                type: 'event',
                                name: e.title,
                                context: { date: e.date, kind: e.type, summary: e.description, tip: e.viewingTip },
                              })
                            }
                          >
                            Explain
                          </Button>
                        </div>
                      </li>
                    );
                  })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
