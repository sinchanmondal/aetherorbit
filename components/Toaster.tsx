'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/lib/store';

const icons = {
  success: CheckCircle2,
  info: Info,
  error: TriangleAlert,
};

export default function Toaster() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
              className="glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3"
            >
              <Icon
                aria-hidden
                className={clsx(
                  'mt-0.5 h-4 w-4 flex-none',
                  t.tone === 'success' && 'text-ion',
                  t.tone === 'info' && 'text-nebula',
                  t.tone === 'error' && 'text-ember',
                )}
              />
              <p className="flex-1 text-sm leading-snug text-starlight">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded-full p-1 text-dust hover:text-starlight"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
