'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useId, useMemo, useState } from 'react';
import { CONSTELLATIONS, SEASONS, seasonForMonth, type Constellation, type Season } from '@/lib/data/constellations';
import { useAppStore } from '@/lib/store';
import { Button, SectionHeader } from './ui';

const starRadius = (mag: number, scale = 1) => Math.min(2.7, Math.max(0.6, 2.6 - mag * 0.42)) * scale;

/**
 * Star chart drawn from the constellation's figure. On selection, lines draw
 * in one after another — a response to the user's choice, not ambient motion.
 */
function StarChart({ constellation, detailed }: { constellation: Constellation; detailed: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const stars = useMemo(() => new Map(constellation.stars.map((s) => [s.id, s])), [constellation]);

  return (
    <svg
      viewBox="-8 -8 116 116"
      className="h-full w-full"
      role={detailed ? 'img' : undefined}
      aria-hidden={detailed ? undefined : true}
      aria-label={detailed ? `Star pattern of ${constellation.name}` : undefined}
    >
      <defs>
        <radialGradient id={`halo-${uid}`}>
          <stop offset="0" stopColor="#E8ECF5" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#5CE1E6" stopOpacity="0.18" />
          <stop offset="1" stopColor="#5CE1E6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {constellation.lines.map(([a, b], i) => {
        const s1 = stars.get(a);
        const s2 = stars.get(b);
        if (!s1 || !s2) return null;
        return detailed ? (
          <motion.line
            key={`${a}-${b}`}
            x1={s1.x}
            y1={s1.y}
            x2={s2.x}
            y2={s2.y}
            stroke="#5CE1E6"
            strokeOpacity="0.55"
            strokeWidth="0.45"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
          />
        ) : (
          <line key={`${a}-${b}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#5CE1E6" strokeOpacity="0.35" strokeWidth="0.8" />
        );
      })}

      {constellation.stars.map((s) => {
        const r = starRadius(s.mag, detailed ? 1 : 1.6);
        return (
          <g key={s.id}>
            {s.mag < 2.5 ? <circle cx={s.x} cy={s.y} r={r * 3.4} fill={`url(#halo-${uid})`} /> : null}
            <circle cx={s.x} cy={s.y} r={r} fill="#E8ECF5" />
            {detailed && s.name ? (
              <text
                x={s.x + r + 1.6}
                y={s.y + 1}
                fontSize="3.1"
                className="fill-dust"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {s.name}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export default function ConstellationGallery() {
  const currentSeason = seasonForMonth(new Date().getMonth());
  const [season, setSeason] = useState<Season | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string>(
    () => CONSTELLATIONS.find((c) => c.season === currentSeason)?.id ?? CONSTELLATIONS[0]!.id,
  );
  const openExplain = useAppStore((s) => s.openExplain);

  const list = season === 'all' ? CONSTELLATIONS : CONSTELLATIONS.filter((c) => c.season === season);
  const selected = CONSTELLATIONS.find((c) => c.id === selectedId) ?? CONSTELLATIONS[0]!;

  const explain = (c: Constellation) =>
    openExplain({
      type: 'constellation',
      name: c.name,
      context: {
        meaning: c.meaning,
        abbreviation: c.abbreviation,
        indianName: c.indianName ?? null,
        brightestStar: c.brightestStar,
        bestMonths: c.bestMonths,
        fromKerala: c.fromKerala,
        notableObjects: c.deepSky.join(', '),
      },
    });

  return (
    <section id="atlas" aria-labelledby="atlas-title" className="py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeader
          id="atlas-title"
          title="Star atlas"
          description="Thirteen constellations as seen from Kerala, with the stories different cultures told about them, their Indian names, and the real astrophysics behind their brightest stars."
          aside={
            <div role="radiogroup" aria-label="Best season to view" className="flex flex-wrap gap-1.5">
              {SEASONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={season === s.id}
                  onClick={() => setSeason(s.id)}
                  className={clsx(
                    'h-8 rounded-full px-3.5 text-sm transition-colors',
                    season === s.id ? 'bg-nebula/20 text-starlight ring-1 ring-nebula/60' : 'text-dust hover:text-starlight',
                  )}
                >
                  {s.label}
                  {s.id === currentSeason ? <span className="ml-1.5 text-ion">now</span> : null}
                </button>
              ))}
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Chart */}
          <div className="glass relative overflow-hidden rounded-[32px] lg:col-span-7">
            <div className="aspect-square p-6 sm:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="h-full w-full"
                >
                  <StarChart constellation={selected} detailed />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/90 to-transparent p-6 sm:p-8">
              <p className="font-display text-6xl font-medium italic leading-none text-starlight sm:text-7xl">{selected.name}</p>
              <p className="mt-2 text-dust">
                {selected.meaning}
                {selected.indianName ? `, known in India as ${selected.indianName}` : ''}
              </p>
            </div>
          </div>

          {/* Details */}
          <AnimatePresence mode="wait">
            <motion.article
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col lg:col-span-5"
            >
              <dl className="grid grid-cols-2 gap-x-6 border-b hairline pb-5 text-sm">
                <div>
                  <dt className="text-dust">Brightest star</dt>
                  <dd className="text-lg text-starlight">{selected.brightestStar}</dd>
                </div>
                <div>
                  <dt className="text-dust">Best evenings</dt>
                  <dd className="text-lg text-starlight">{selected.bestMonths}</dd>
                </div>
              </dl>

              <div className="space-y-6 py-6">
                <div>
                  <h3 className="font-display text-xl font-medium text-ion">Finding it from Kerala</h3>
                  <p className="mt-1.5 max-w-prose leading-relaxed text-starlight/85">{selected.fromKerala}</p>
                </div>
                <div>
                  <h3 className="font-display text-xl font-medium text-ion">Stories</h3>
                  <p className="mt-1.5 max-w-prose font-display text-[1.2rem] leading-[1.6] text-starlight/90">{selected.mythology}</p>
                </div>
                <div>
                  <h3 className="font-display text-xl font-medium text-ion">What astronomers know</h3>
                  <p className="mt-1.5 max-w-prose leading-relaxed text-starlight/85">{selected.astronomy}</p>
                </div>
                <div>
                  <h3 className="font-display text-xl font-medium text-ion">Worth a telescope</h3>
                  <p className="mt-1.5 text-starlight/85">{selected.deepSky.join(', ')}</p>
                </div>
              </div>

              <div className="mt-auto">
                <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={() => explain(selected)}>
                  Explain {selected.name} with AI
                </Button>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        {/* Index */}
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {list.map((c) => {
            const active = c.id === selected.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={active}
                  className={clsx(
                    'group flex w-full flex-col rounded-2xl p-3 text-left transition-colors',
                    active ? 'bg-ion/[0.07] ring-1 ring-ion/50' : 'hover:bg-white/[0.035]',
                  )}
                >
                  <span className="block aspect-square w-full opacity-80 transition-opacity group-hover:opacity-100">
                    <StarChart constellation={c} detailed={false} />
                  </span>
                  <span className="mt-2 font-display text-xl italic text-starlight">{c.name}</span>
                  <span className="text-sm text-dust">{c.indianName ?? c.meaning}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
