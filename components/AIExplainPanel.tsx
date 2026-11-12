'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, Sparkles, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOverlay } from '@/lib/hooks/useOverlay';
import { MarkdownLite } from '@/lib/markdown';
import { useAppStore } from '@/lib/store';
import type { AIDetailLevel, AITargetType } from '@/lib/types';

const TYPE_LABEL: Record<AITargetType, string> = {
  satellite: 'Satellite',
  constellation: 'Constellation',
  mystery: 'Unexplained phenomenon',
  launch: 'Launch',
  mission: 'Mission',
  event: 'Sky event',
};

const LEVELS: Array<{ id: AIDetailLevel; label: string }> = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'enthusiast', label: 'Enthusiast' },
];

type Status = 'idle' | 'streaming' | 'done' | 'error';

export default function AIExplainPanel() {
  const target = useAppStore((s) => s.aiTarget);
  const close = useAppStore((s) => s.closeExplain);
  const level = useAppStore((s) => s.aiLevel);
  const setLevel = useAppStore((s) => s.setAILevel);
  const cacheExplanation = useAppStore((s) => s.cacheExplanation);

  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const open = target !== null;
  useOverlay(open, close);

  const run = useCallback(
    async (force: boolean) => {
      if (!target) return;
      const key = `${target.type}:${target.name}:${level}`;
      const cached = useAppStore.getState().aiCache[key];
      abortRef.current?.abort();

      if (cached && !force) {
        setOffline(false);
        setText(cached);
        setStatus('done');
        setError(null);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setText('');
      setError(null);
      setStatus('streaming');

      try {
        const res = await fetch('/api/ai-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: target.type, name: target.name, level, context: target.context }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `The explainer returned ${res.status}.`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setText(acc);
        }
        acc += decoder.decode();
        setText(acc);
        // Offline fallbacks aren't cached, so they refresh once a key is added.
        const isFallback = res.headers.get('X-AetherOrbit-Fallback') === '1';
        setOffline(isFallback);
        if (!isFallback) cacheExplanation(key, acc);
        setStatus('done');
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'The explanation could not be generated.');
        setStatus('error');
      }
    },
    [target, level, cacheExplanation],
  );

  useEffect(() => {
    if (!target) return;
    void run(false);
    return () => abortRef.current?.abort();
  }, [target, level, run]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => closeRef.current?.focus(), 50);
      scrollRef.current?.scrollTo({ top: 0 });
      return () => window.clearTimeout(id);
    }
    setText('');
    setStatus('idle');
  }, [open, target]);

  return (
    <AnimatePresence>
      {open && target ? (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-panel-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            className="glass-strong absolute inset-y-0 right-0 flex w-full max-w-[38rem] flex-col sm:rounded-l-[32px]"
          >
            <header className="flex items-start gap-4 border-b hairline px-6 pb-5 pt-6 sm:px-8">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm text-dust">
                  <Sparkles className="h-4 w-4 text-ion" /> {TYPE_LABEL[target.type]}
                </p>
                <h2 id="ai-panel-title" className="mt-1 font-display text-[2.1rem] font-medium leading-tight text-starlight">
                  {target.name}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="grid h-10 w-10 flex-none place-items-center rounded-full text-dust hover:bg-white/[0.05] hover:text-starlight"
                aria-label="Close explanation"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex items-center justify-between gap-3 px-6 py-3 sm:px-8">
              <div role="radiogroup" aria-label="Explanation depth" className="flex rounded-full border border-white/10 p-1">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={level === l.id}
                    onClick={() => setLevel(l.id)}
                    className={clsx(
                      'h-8 rounded-full px-3.5 text-sm transition-colors',
                      level === l.id ? 'bg-ion/15 text-ion' : 'text-dust hover:text-starlight',
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void run(true)}
                disabled={status === 'streaming'}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-dust hover:text-starlight disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Regenerate
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-10 sm:px-8" aria-live="polite" aria-busy={status === 'streaming'}>
              {status === 'error' ? (
                <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/[0.06] p-5">
                  <p className="text-starlight">{error}</p>
                  <button type="button" onClick={() => void run(true)} className="mt-3 text-sm text-ion hover:text-starlight">
                    Try again
                  </button>
                </div>
              ) : text ? (
                <div className="max-w-prose pt-2 text-[1.02rem] leading-[1.7] text-starlight/85">
                  <MarkdownLite text={text} />
                  {status === 'streaming' ? (
                    <span aria-hidden className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-ion" />
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3 pt-4" aria-label="Writing explanation">
                  <div className="skeleton h-7 w-1/2" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-11/12" />
                  <div className="skeleton h-4 w-4/5" />
                </div>
              )}
            </div>

            <footer className="border-t hairline px-6 py-4 text-xs leading-relaxed text-dust sm:px-8">
              {offline
                ? 'Showing stored data only. AI explanations are switched off on this deployment.'
                : 'Written by AI from AetherOrbit’s live data. Double-check dates and figures before relying on them.'}
            </footer>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
