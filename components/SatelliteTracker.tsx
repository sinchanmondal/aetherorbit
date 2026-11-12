'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellPlus, BellRing, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useMemo, useState } from 'react';
import { ISS_NORAD_ID } from '@/lib/config';
import { formatDate, formatDuration, formatNumber, formatTime, relativeDay } from '@/lib/format';
import { useNow } from '@/lib/hooks/useNow';
import { isReminderActive, useAppStore } from '@/lib/store';
import type { Satellite, SourceStatus, SpaceWeather, VisualPass } from '@/lib/types';
import { Button, Skeleton, SourceNote } from './ui';

export const SATELLITE_GROUPS: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Brightest' },
  { id: 2, label: 'ISS' },
  { id: 0, label: 'Everything overhead' },
  { id: 3, label: 'Weather' },
  { id: 26, label: 'Science' },
  { id: 46, label: 'NavIC' },
  { id: 52, label: 'Starlink' },
  { id: 32, label: 'CubeSats' },
];

interface SatelliteTrackerProps {
  satellites: Satellite[];
  category: number;
  onCategoryChange: (category: number) => void;
  loading: boolean;
  refreshing: boolean;
  status?: SourceStatus;
  passes: VisualPass[];
  passesStatus?: SourceStatus;
  spaceWeather: SpaceWeather | null;
  updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Sky dome geometry: zenith at centre, horizon at the rim, north up, east right
// ---------------------------------------------------------------------------
const VIEW = 560;
const C = VIEW / 2;
const R = 236;

function project(azimuth: number, elevation: number) {
  const r = (R * (90 - Math.max(0, elevation))) / 90;
  const a = (azimuth * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

function shortName(name: string) {
  if (/^SPACE STATION$/i.test(name)) return 'ISS';
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

function SkyDome({
  satellites,
  selectedId,
  onSelect,
  loading,
}: {
  satellites: Satellite[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
}) {
  const [hoverId, setHoverId] = useState<number | null>(null);
  const hovered = satellites.find((s) => s.noradId === hoverId) ?? null;
  const sweepEnd = project(40, 0);

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-auto w-full" role="img" aria-labelledby="dome-title dome-desc">
      <title id="dome-title">Sky dome</title>
      <desc id="dome-desc">
        {`${satellites.length} satellites above the horizon, plotted by direction and height. The centre is straight overhead; the edge is the horizon.`}
      </desc>
      <defs>
        <radialGradient id="dome-fill" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5B4FC0" stopOpacity="0.16" />
          <stop offset="0.7" stopColor="#0E1220" stopOpacity="0.3" />
          <stop offset="1" stopColor="#5CE1E6" stopOpacity="0.08" />
        </radialGradient>
        <linearGradient id="sweep-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5CE1E6" stopOpacity="0" />
          <stop offset="1" stopColor="#5CE1E6" stopOpacity="0.16" />
        </linearGradient>
        <filter id="sat-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* The one orchestrated load moment: the dome assembles, then satellites appear */}
      <motion.g
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${C}px ${C}px` }}
      >
        <circle cx={C} cy={C} r={R} fill="url(#dome-fill)" />
        <circle cx={C} cy={C} r={R} fill="none" stroke="#5CE1E6" strokeOpacity="0.35" strokeWidth="1.2" />
        <circle cx={C} cy={C} r={(R * 2) / 3} fill="none" stroke="#E8ECF5" strokeOpacity="0.08" />
        <circle cx={C} cy={C} r={R / 3} fill="none" stroke="#E8ECF5" strokeOpacity="0.08" strokeDasharray="2 5" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#E8ECF5" strokeOpacity="0.05" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#E8ECF5" strokeOpacity="0.05" />
        {Array.from({ length: 72 }, (_, i) => {
          const az = i * 5;
          const major = az % 45 === 0;
          const len = major ? 10 : az % 15 === 0 ? 6 : 3;
          const a = (az * Math.PI) / 180;
          return (
            <line
              key={az}
              x1={C + R * Math.sin(a)}
              y1={C - R * Math.cos(a)}
              x2={C + (R + len) * Math.sin(a)}
              y2={C - (R + len) * Math.cos(a)}
              stroke="#E8ECF5"
              strokeOpacity={major ? 0.45 : 0.18}
            />
          );
        })}
        {(
          [
            ['N', 0],
            ['E', 90],
            ['S', 180],
            ['W', 270],
          ] as const
        ).map(([label, az]) => {
          const a = (az * Math.PI) / 180;
          return (
            <text
              key={label}
              x={C + (R + 24) * Math.sin(a)}
              y={C - (R + 24) * Math.cos(a)}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-starlight font-display"
              fontSize="17"
            >
              {label}
            </text>
          );
        })}
        <text x={C + 4} y={C - (R * 2) / 3 + 14} className="fill-dust" fontSize="11">
          30°
        </text>
        <text x={C + 4} y={C - R / 3 + 14} className="fill-dust" fontSize="11">
          60°
        </text>
        <circle cx={C} cy={C} r="2.5" fill="#E8ECF5" fillOpacity="0.5" />
      </motion.g>

      {/* Radar sweep (hidden for reduced motion) */}
      <g className="animate-sweep motion-reduce:hidden" style={{ transformOrigin: `${C}px ${C}px` }}>
        <path d={`M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 0 1 ${sweepEnd.x} ${sweepEnd.y} Z`} fill="url(#sweep-fill)" />
      </g>

      {/* Satellites */}
      {satellites.map((s, i) => {
        const p = project(s.azimuth, s.elevation);
        const selected = s.noradId === selectedId;
        const colour = s.sunlit ? '#5CE1E6' : '#8A93A8';
        const radius = s.profile.featured ? 5 : 3.2;
        return (
          <motion.g
            key={`${s.noradId}-${s.name}`}
            initial={{ opacity: 0, x: p.x, y: p.y }}
            animate={{ opacity: 1, x: p.x, y: p.y }}
            transition={{
              opacity: { delay: 0.5 + Math.min(i, 30) * 0.02, duration: 0.4 },
              x: { duration: 1.4, ease: 'easeInOut' },
              y: { duration: 1.4, ease: 'easeInOut' },
            }}
            onClick={() => onSelect(s.noradId)}
            onMouseEnter={() => setHoverId(s.noradId)}
            onMouseLeave={() => setHoverId(null)}
            className="cursor-pointer"
          >
            <circle r="14" fill="transparent" />
            {selected ? (
              <>
                <circle
                  r="12"
                  fill="none"
                  stroke={colour}
                  strokeOpacity="0.7"
                  className="animate-pulse-ring"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
                <circle r="9" fill="none" stroke={colour} strokeOpacity="0.9" strokeWidth="1.2" />
              </>
            ) : null}
            <circle r={radius} fill={colour} filter="url(#sat-glow)" />
            {s.profile.featured || selected ? (
              <text x={radius + 7} y="4" fontSize="12" className="fill-starlight" style={{ paintOrder: 'stroke' }} stroke="#07080D" strokeWidth="3">
                {shortName(s.name)}
              </text>
            ) : null}
          </motion.g>
        );
      })}

      {hovered && hovered.noradId !== selectedId && !hovered.profile.featured ? (
        (() => {
          const p = project(hovered.azimuth, hovered.elevation);
          const label = `${shortName(hovered.name)}  ${Math.round(hovered.elevation)}°`;
          return (
            <g pointerEvents="none" transform={`translate(${p.x + 10} ${p.y - 26})`}>
              <rect width={label.length * 6.6 + 16} height="24" rx="12" fill="#0E1220" stroke="#5CE1E6" strokeOpacity="0.4" />
              <text x="8" y="16" fontSize="12" className="fill-starlight">
                {label}
              </text>
            </g>
          );
        })()
      ) : null}

      {loading ? (
        <text x={C} y={C + 40} textAnchor="middle" className="fill-dust" fontSize="14">
          Scanning the sky…
        </text>
      ) : satellites.length === 0 ? (
        <text x={C} y={C + 40} textAnchor="middle" className="fill-dust" fontSize="14">
          Nothing from this group is above the horizon right now.
        </text>
      ) : null}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------
function Reading({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="py-3">
      <dt className="text-sm text-dust">{label}</dt>
      <dd className="mt-0.5 text-[1.05rem] text-starlight tabular">
        {value}
        {hint ? <span className="ml-1.5 text-sm text-dust">{hint}</span> : null}
      </dd>
    </div>
  );
}

function SatelliteDetail({ satellite, spaceWeather }: { satellite: Satellite; spaceWeather: SpaceWeather | null }) {
  const openExplain = useAppStore((s) => s.openExplain);
  const addReminder = useAppStore((s) => s.addReminder);
  const reminders = useAppStore((s) => s.reminders);
  const following = isReminderActive(reminders, 'satellite_pass', String(satellite.noradId));
  const env = satellite.environment;
  const canFollow = satellite.noradId > 0;

  const explain = () =>
    openExplain({
      type: 'satellite',
      name: satellite.name,
      context: {
        noradId: satellite.noradId,
        internationalDesignator: satellite.intlDesignator,
        launched: satellite.launchDate,
        operator: satellite.profile.operator,
        category: satellite.profile.category,
        purpose: satellite.profile.purpose,
        altitudeKm: Math.round(satellite.altitudeKm),
        velocityKmPerSec: Number(satellite.velocityKms.toFixed(2)),
        orbitalPeriodMin: Number(satellite.periodMinutes.toFixed(1)),
        orbitClass: satellite.orbitClass,
        azimuthDeg: Math.round(satellite.azimuth),
        elevationDeg: Math.round(satellite.elevation),
        rangeKm: Math.round(satellite.rangeKm),
        inSunlight: satellite.sunlit,
        thermosphereTempK: env.thermosphereK,
        kpIndex: spaceWeather?.kp ?? null,
      },
    });

  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={satellite.noradId + satellite.name}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        className="glass flex h-full flex-col rounded-[32px] p-6 sm:p-8"
        aria-live="polite"
      >
        <p className="text-sm text-dust">
          {satellite.profile.category}
          {satellite.profile.country !== '—' ? `, ${satellite.profile.country}` : ''}
        </p>
        <h3 className="mt-2 font-display text-[2.6rem] font-medium leading-[1.02] text-starlight">{satellite.name}</h3>
        <p className="mt-2 text-sm text-dust tabular">
          NORAD {satellite.noradId || '—'}, international designator {satellite.intlDesignator}
          {satellite.launchDate ? `, launched ${formatDate(satellite.launchDate, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
        </p>
        <p className="mt-5 max-w-prose leading-relaxed text-starlight/85">{satellite.profile.purpose}</p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 border-t hairline sm:grid-cols-3">
          <Reading label="Altitude" value={`${formatNumber(satellite.altitudeKm)} km`} />
          <Reading label="Speed" value={`${satellite.velocityKms.toFixed(2)} km/s`} hint={`${formatNumber(satellite.velocityKms * 3600)} km/h`} />
          <Reading label="One orbit" value={`${satellite.periodMinutes.toFixed(0)} min`} hint={satellite.orbitClass} />
          <Reading label="Direction" value={`${Math.round(satellite.azimuth)}° ${satellite.compass}`} />
          <Reading label="Height in sky" value={`${Math.round(satellite.elevation)}°`} />
          <Reading label="Distance" value={`${formatNumber(satellite.rangeKm)} km`} />
        </dl>

        <div className="mt-2 rounded-2xl border hairline bg-white/[0.02] p-4">
          <p className="flex items-center gap-2 text-sm text-starlight">
            <span className={clsx('h-2 w-2 rounded-full', satellite.sunlit ? 'bg-ion shadow-[0_0_10px_#5CE1E6]' : 'bg-dust')} />
            {satellite.sunlit ? 'In sunlight: may be visible to the eye after dusk' : "In Earth's shadow: not visible"}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-dust">Thermosphere temperature</dt>
              <dd className="text-starlight tabular">
                {env.thermosphereK ? `≈ ${formatNumber(env.thermosphereK)} K` : 'Above the thermosphere'}
              </dd>
            </div>
            <div>
              <dt className="text-dust">Typical surface temperature</dt>
              <dd className="text-starlight tabular">
                {env.surfaceTempC.min}°C to {env.surfaceTempC.max > 0 ? '+' : ''}
                {env.surfaceTempC.max}°C
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-dust">Radiation</dt>
              <dd className="text-starlight">{env.radiationZone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-dust">Atmospheric drag</dt>
              <dd className="text-starlight">{env.atmosphericDrag}</dd>
            </div>
          </dl>
          {spaceWeather ? (
            <p className="mt-3 border-t hairline pt-3 text-sm text-dust tabular">
              Space weather: Kp {spaceWeather.kp?.toFixed(1) ?? '—'} ({spaceWeather.geomagneticLevel.toLowerCase()}), solar wind{' '}
              {formatNumber(spaceWeather.solarWindSpeed)} km/s at {formatNumber(spaceWeather.solarWindDensity, 1)} p/cm³ and{' '}
              {formatNumber(spaceWeather.solarWindTempK)} K, Bz {formatNumber(spaceWeather.bz, 1)} nT.
            </p>
          ) : null}
        </div>

        {satellite.profile.specs.length ? (
          <dl className="mt-5 divide-y divide-white/[0.06] text-sm">
            {satellite.profile.specs.map((spec) => (
              <div key={spec.label} className="flex justify-between gap-6 py-2">
                <dt className="text-dust">{spec.label}</dt>
                <dd className="text-right text-starlight">{spec.value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-6 py-2">
              <dt className="text-dust">Operator</dt>
              <dd className="text-right text-starlight">{satellite.profile.operator}</dd>
            </div>
          </dl>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-dust/80">
          Speed and period assume a circular orbit. Temperatures are model estimates (simplified Jacchia thermosphere), not
          on-board telemetry.
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={explain}>
            Explain with AI
          </Button>
          {canFollow ? (
            <Button
              icon={following ? <BellRing className="h-4 w-4 text-ion" /> : <BellPlus className="h-4 w-4" />}
              disabled={following}
              onClick={() =>
                addReminder({
                  kind: 'satellite_pass',
                  targetRef: String(satellite.noradId),
                  label: `${satellite.name} visible passes`,
                  metadata: { noradId: satellite.noradId, name: satellite.name },
                })
              }
            >
              {following ? 'Following passes' : 'Remind me of passes'}
            </Button>
          ) : null}
        </div>
      </motion.article>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SatelliteTracker({
  satellites,
  category,
  onCategoryChange,
  loading,
  refreshing,
  status,
  passes,
  passesStatus,
  spaceWeather,
  updatedAt,
}: SatelliteTrackerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const now = useNow(30_000);
  const addReminder = useAppStore((s) => s.addReminder);
  const reminders = useAppStore((s) => s.reminders);

  const visible = useMemo(() => satellites.filter((s) => s.elevation >= 0), [satellites]);
  const selected = useMemo(
    () => satellites.find((s) => s.noradId === selectedId) ?? visible[0] ?? satellites[0] ?? null,
    [satellites, visible, selectedId],
  );
  const sunlitCount = visible.filter((s) => s.sunlit).length;

  return (
    <section id="sky" aria-label="Live satellite tracker" className="relative">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Dome */}
          <div className="glass relative rounded-[32px] p-4 sm:p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div role="radiogroup" aria-label="Satellite group" className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                {SATELLITE_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={g.id === category}
                    onClick={() => onCategoryChange(g.id)}
                    className={clsx(
                      'h-8 flex-none whitespace-nowrap rounded-full px-3 text-sm transition-colors',
                      g.id === category
                        ? 'bg-ion/15 text-ion ring-1 ring-ion/50'
                        : 'text-dust hover:bg-white/[0.04] hover:text-starlight',
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-dust tabular" aria-live="polite">
                {refreshing ? 'Updating…' : `${visible.length} above the horizon`}
              </p>
            </div>

            <div className="mx-auto mt-2 max-w-[640px]">
              <SkyDome satellites={visible} selectedId={selected?.noradId ?? null} onSelect={setSelectedId} loading={loading} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-dust">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-ion shadow-[0_0_8px_#5CE1E6]" /> Sunlit ({sunlitCount})
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-dust" /> In Earth&apos;s shadow ({visible.length - sunlitCount})
                </span>
              </div>
              {updatedAt ? <span className="tabular">Positions at {formatTime(updatedAt, { second: '2-digit' })} IST</span> : null}
            </div>
            <SourceNote status={status} className="mt-3 px-1" />
          </div>

          {/* Selected satellite */}
          <div className="lg:col-span-5">
            {selected ? (
              <SatelliteDetail satellite={selected} spaceWeather={spaceWeather} />
            ) : (
              <div className="glass flex h-full min-h-[420px] flex-col justify-center gap-4 rounded-[32px] p-8">
                {loading ? (
                  <>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-24 w-full" />
                  </>
                ) : (
                  <p className="text-dust">Pick a satellite group with objects overhead to see live telemetry.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Satellite list */}
          <div className="glass overflow-hidden rounded-[24px] lg:col-span-7">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b hairline px-5 py-3 text-sm text-dust sm:grid-cols-[minmax(0,1.6fr)_1fr_5.5rem_5.5rem]">
              <span>Object</span>
              <span className="hidden sm:block">Height in sky</span>
              <span className="hidden text-right sm:block">Altitude</span>
              <span className="text-right">Speed</span>
            </div>
            <ul className="max-h-[420px] overflow-y-auto">
              {loading
                ? Array.from({ length: 6 }, (_, i) => (
                    <li key={i} className="px-5 py-3">
                      <Skeleton className="h-9 w-full" />
                    </li>
                  ))
                : visible.map((s) => {
                    const active = selected?.noradId === s.noradId;
                    return (
                      <li key={`${s.noradId}-${s.name}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(s.noradId)}
                          aria-pressed={active}
                          className={clsx(
                            'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1.6fr)_1fr_5.5rem_5.5rem]',
                            active ? 'bg-ion/[0.07]' : 'hover:bg-white/[0.03]',
                          )}
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className={clsx('h-1.5 w-1.5 flex-none rounded-full', s.sunlit ? 'bg-ion' : 'bg-dust/60')} />
                              <span className="truncate text-starlight">{s.name}</span>
                            </span>
                            <span className="block truncate pl-3.5 text-sm text-dust">{s.profile.category}</span>
                          </span>
                          <span className="hidden items-center gap-3 sm:flex">
                            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <span
                                className="block h-full rounded-full bg-gradient-to-r from-nebula to-ion"
                                style={{ width: `${Math.max(3, (s.elevation / 90) * 100)}%` }}
                              />
                            </span>
                            <span className="w-9 text-right text-sm text-starlight tabular">{Math.round(s.elevation)}°</span>
                          </span>
                          <span className="hidden text-right text-sm text-starlight tabular sm:block">
                            {formatNumber(s.altitudeKm)} km
                          </span>
                          <span className="text-right text-sm text-starlight tabular">{s.velocityKms.toFixed(2)} km/s</span>
                        </button>
                      </li>
                    );
                  })}
              {!loading && visible.length === 0 ? (
                <li className="px-5 py-8 text-dust">No objects from this group are above the horizon. Try “Everything overhead”.</li>
              ) : null}
            </ul>
          </div>

          {/* ISS visible passes */}
          <div className="glass rounded-[24px] p-6 lg:col-span-5">
            <h3 className="font-display text-2xl font-medium text-starlight">When to see the ISS</h3>
            <p className="mt-1 text-sm text-dust">
              Naked-eye passes over the next week. The station looks like a bright, steady star gliding across the sky with no
              blinking lights.
            </p>
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {passes.length === 0 ? (
                <li className="py-4 text-dust">
                  {loading ? 'Calculating passes…' : 'No visible passes in the next few days. The ISS will return to evening skies soon.'}
                </li>
              ) : (
                passes.slice(0, 4).map((p) => {
                  const ref = `${ISS_NORAD_ID}@${p.start}`;
                  const set = isReminderActive(reminders, 'satellite_pass', ref);
                  return (
                    <li key={p.start} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="text-starlight tabular">
                          {now ? relativeDay(p.start, now) : formatDate(p.start)}, {formatTime(p.start)}–{formatTime(p.end)}
                        </p>
                        <p className="text-sm text-dust">
                          Rises {p.startCompass}, peaks {p.maxElevation}° {p.peakCompass}, sets {p.endCompass}.{' '}
                          {formatDuration(p.durationSec)}
                          {p.magnitude !== null ? `, magnitude ${p.magnitude.toFixed(1)}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={set ? 'quiet' : 'ghost'}
                        disabled={set}
                        icon={set ? <BellRing className="h-3.5 w-3.5 text-ion" /> : <BellPlus className="h-3.5 w-3.5" />}
                        onClick={() =>
                          addReminder({
                            kind: 'satellite_pass',
                            targetRef: ref,
                            label: `ISS pass ${formatDate(p.start)} ${formatTime(p.start)} IST`,
                            eventAt: p.start,
                            metadata: { noradId: ISS_NORAD_ID, maxElevation: p.maxElevation },
                          })
                        }
                      >
                        {set ? 'Reminder set' : 'Remind me'}
                      </Button>
                    </li>
                  );
                })
              )}
            </ul>
            <SourceNote status={passesStatus} className="mt-2" />
          </div>
        </div>
      </div>
    </section>
  );
}
