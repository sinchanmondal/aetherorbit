'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ExternalLink, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { MYSTERIES, STATUS_DESCRIPTIONS, type Mystery, type MysteryStatus } from '@/lib/data/mysteries';
import { formatDate } from '@/lib/format';
import { useAppStore } from '@/lib/store';
import type { DeepSpaceImage, DeepSpaceResponse } from '@/lib/types';
import { Button, SectionHeader, Skeleton } from './ui';

const statusClass: Record<MysteryStatus, string> = {
  Unexplained: 'text-ember ring-ember/40',
  Debated: 'text-flare ring-flare/40',
  'Largely explained': 'text-ion ring-ion/40',
};

/** Image that falls back from the medium rendition to the thumbnail, then to a nebula gradient. */
function SpaceImage({ image, className, seed }: { image: DeepSpaceImage | null; className?: string; seed: number }) {
  const [src, setSrc] = useState(image?.imageUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(image?.imageUrl ?? null);
    setFailed(false);
  }, [image?.imageUrl]);

  if (!image || !src || failed) {
    const hue = (seed * 47) % 360;
    return (
      <div
        aria-hidden
        className={clsx('h-full w-full', className)}
        style={{
          background: `radial-gradient(circle at 30% 35%, hsla(${hue}, 80%, 70%, 0.35), transparent 55%), radial-gradient(circle at 70% 70%, hsla(${(hue + 80) % 360}, 70%, 60%, 0.25), transparent 50%), #0E1220`,
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={image.title}
      loading="lazy"
      decoding="async"
      className={clsx('h-full w-full object-cover', className)}
      onError={() => {
        if (src !== image.thumbUrl) setSrc(image.thumbUrl);
        else setFailed(true);
      }}
    />
  );
}

function MysteryRow({ mystery, image, index }: { mystery: Mystery; image: DeepSpaceImage | null; index: number }) {
  const [open, setOpen] = useState(false);
  const openExplain = useAppStore((s) => s.openExplain);
  const panelId = `mystery-${mystery.id}`;

  return (
    <li className="border-b hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left sm:grid-cols-[6rem_minmax(0,1fr)_10rem_auto] sm:gap-6"
      >
        <span className="block aspect-square overflow-hidden rounded-2xl ring-1 ring-white/10">
          <SpaceImage image={image} seed={index + 3} />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-2xl font-medium text-starlight sm:text-[1.7rem]">{mystery.title}</span>
          <span className="mt-0.5 block text-dust">{mystery.hook}</span>
        </span>
        <span className="hidden sm:block">
          <span className={clsx('inline-block rounded-full px-2.5 py-0.5 text-xs ring-1', statusClass[mystery.status])}>
            {mystery.status}
          </span>
        </span>
        <ChevronDown aria-hidden className={clsx('h-5 w-5 text-dust transition-transform duration-300', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-8 pb-8 sm:pl-[7.5rem] lg:grid-cols-2">
              <div>
                <p className="sm:hidden">
                  <span className={clsx('inline-block rounded-full px-2.5 py-0.5 text-xs ring-1', statusClass[mystery.status])}>
                    {mystery.status}
                  </span>
                </p>
                <h4 className="mt-3 font-display text-xl text-ion sm:mt-0">What was observed</h4>
                <p className="mt-1.5 max-w-prose leading-relaxed text-starlight/85">{mystery.observed}</p>
                <p className="mt-3 text-sm text-dust">{STATUS_DESCRIPTIONS[mystery.status]}.</p>
              </div>
              <div>
                <h4 className="font-display text-xl text-ion">Leading ideas</h4>
                <ul className="mt-2 space-y-2">
                  {mystery.ideas.map((idea) => (
                    <li key={idea} className="flex gap-3 text-starlight/85">
                      <span aria-hidden className="mt-[0.65em] h-1 w-1 flex-none rounded-full bg-nebula" />
                      <span className="leading-relaxed">{idea}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5"
                  size="sm"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  onClick={() =>
                    openExplain({
                      type: 'mystery',
                      name: mystery.title,
                      context: {
                        status: mystery.status,
                        observed: mystery.observed,
                        leadingIdeas: mystery.ideas.join(' | '),
                      },
                    })
                  }
                >
                  Explain with AI
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export default function MysteryData() {
  const [data, setData] = useState<DeepSpaceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/deep-space', { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<DeepSpaceResponse>) : null))
      .then((d) => setData(d))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const apod = data?.apod ?? null;
  const gallery = data?.gallery ?? [];

  return (
    <section id="unexplained" aria-labelledby="unexplained-title" className="py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeader
          id="unexplained-title"
          title="Unexplained"
          description="Open questions astronomers are still working on, each with an honest note on how close it is to an answer. Below them, today's deep-space imagery from NASA."
        />

        <ul className="border-t hairline">
          {MYSTERIES.map((m, i) => (
            <MysteryRow key={m.id} mystery={m} image={data?.mysteryImages[m.id] ?? null} index={i} />
          ))}
        </ul>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Astronomy Picture of the Day */}
          <figure className="glass overflow-hidden rounded-[32px] lg:col-span-5">
            <div className="aspect-[4/3] bg-hull">
              {loading ? <Skeleton className="h-full w-full rounded-none" /> : <SpaceImage image={apod} seed={11} />}
            </div>
            <figcaption className="p-6">
              <p className="text-sm text-dust">
                Astronomy Picture of the Day{apod?.date ? `, ${formatDate(apod.date, { day: 'numeric', month: 'long' })}` : ''}
              </p>
              <p className="mt-1 font-display text-2xl font-medium text-starlight">{apod?.title ?? (loading ? '' : 'Unavailable right now')}</p>
              {apod ? <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-dust">{apod.description}</p> : null}
              {apod?.link ? (
                <a
                  href={apod.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-ion hover:text-starlight"
                >
                  View on apod.nasa.gov <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {apod ? <p className="mt-2 text-xs text-dust/80">Credit: {apod.credit}</p> : null}
            </figcaption>
          </figure>

          {/* Gallery */}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
            {(loading ? Array.from({ length: 6 }, () => null) : gallery).map((img, i) => (
              <li key={img?.id ?? i} className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-hull ring-1 ring-white/[0.06]">
                {img ? (
                  <a href={img.link ?? undefined} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                    <SpaceImage image={img} seed={i} className="transition-transform duration-700 group-hover:scale-[1.04]" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/95 via-void/50 to-transparent p-4 pt-10">
                      <span className="line-clamp-2 block text-sm text-starlight">{img.title}</span>
                      <span className="block truncate text-xs text-dust">{img.credit}</span>
                    </span>
                  </a>
                ) : (
                  <Skeleton className="h-full w-full rounded-none" />
                )}
              </li>
            ))}
            {!loading && gallery.length === 0 ? (
              <li className="col-span-full rounded-3xl border hairline p-6 text-dust">
                NASA's image library didn't respond. The gallery will fill in on the next visit.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
