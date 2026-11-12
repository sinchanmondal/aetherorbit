'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Orbit, Rocket, Trash2, X } from 'lucide-react';
import { useCallback } from 'react';
import { OBSERVER_SHORT_NAME } from '@/lib/config';
import { formatDateTime } from '@/lib/format';
import { useOverlay } from '@/lib/hooks/useOverlay';
import { useAppStore } from '@/lib/store';
import type { Reminder, ReminderKind } from '@/lib/types';
import { Button, Skeleton, Toggle } from './ui';

const GROUPS: Array<{ kind: ReminderKind; title: string; icon: typeof Rocket }> = [
  { kind: 'launch', title: 'Launches', icon: Rocket },
  { kind: 'celestial_event', title: 'Sky events', icon: CalendarClock },
  { kind: 'satellite_pass', title: 'Satellite passes', icon: Orbit },
];

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const toggle = useAppStore((s) => s.toggleReminder);
  const remove = useAppStore((s) => s.removeReminder);
  const past = reminder.event_at ? Date.parse(reminder.event_at) < Date.now() : false;

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className={reminder.is_active ? 'text-starlight' : 'text-dust line-through decoration-dust/50'}>{reminder.label}</p>
        <p className="text-sm text-dust tabular">
          {reminder.event_at
            ? `${formatDateTime(reminder.event_at)} IST${past ? ' (passed)' : ''}`
            : 'Every visible pass, included in your daily digest'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={reminder.is_active}
        aria-label={reminder.is_active ? `Pause ${reminder.label}` : `Resume ${reminder.label}`}
        onClick={() => void toggle(reminder.id, !reminder.is_active)}
        className="mt-1 h-6 w-11 flex-none rounded-full border border-white/10 bg-white/[0.04] p-0.5 transition-colors aria-checked:border-ion/60 aria-checked:bg-ion/30"
      >
        <span
          className={`block h-4 w-4 rounded-full transition-transform duration-200 ${
            reminder.is_active ? 'translate-x-5 bg-ion' : 'translate-x-0.5 bg-dust'
          }`}
        />
      </button>
      <button
        type="button"
        onClick={() => void remove(reminder.id)}
        className="grid h-8 w-8 flex-none place-items-center rounded-full text-dust hover:bg-white/[0.05] hover:text-ember"
        aria-label={`Delete ${reminder.label}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export default function ReminderCenter() {
  const open = useAppStore((s) => s.remindersOpen);
  const setOpen = useAppStore((s) => s.setRemindersOpen);
  const user = useAppStore((s) => s.user);
  const reminders = useAppStore((s) => s.reminders);
  const preferences = useAppStore((s) => s.preferences);
  const loading = useAppStore((s) => s.remindersLoading);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const openAuth = useAppStore((s) => s.openAuth);

  const close = useCallback(() => setOpen(false), [setOpen]);
  useOverlay(open, close);

  return (
    <AnimatePresence>
      {open ? (
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
            aria-labelledby="reminders-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            className="glass-strong absolute inset-y-0 right-0 flex w-full max-w-md flex-col sm:rounded-l-[32px]"
          >
            <header className="flex items-start justify-between gap-4 border-b hairline px-6 py-6">
              <div>
                <h2 id="reminders-title" className="font-display text-3xl font-medium text-starlight">
                  Reminders
                </h2>
                <p className="mt-1 text-sm text-dust">Delivered in one email each morning at 6:00 IST.</p>
              </div>
              <button
                type="button"
                onClick={close}
                autoFocus
                className="grid h-10 w-10 place-items-center rounded-full text-dust hover:bg-white/[0.05] hover:text-starlight"
                aria-label="Close reminders"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {!user ? (
                <div className="space-y-4">
                  <p className="text-starlight">Sign in to save reminders and get a daily sky digest by email.</p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      close();
                      openAuth('signin');
                    }}
                  >
                    Sign in
                  </Button>
                </div>
              ) : (
                <>
                  <section aria-labelledby="digest-title" className="space-y-5">
                    <h3 id="digest-title" className="font-display text-xl text-ion">
                      Daily digest
                    </h3>
                    {preferences ? (
                      <>
                        <Toggle
                          label="Send me a daily digest"
                          description="Includes everything below plus any reminders you've set."
                          checked={preferences.daily_digest}
                          onChange={(v) => void updatePreferences({ daily_digest: v })}
                        />
                        <div className="space-y-4 border-l hairline pl-4">
                          <Toggle
                            label="Launches"
                            description="NASA, ISRO, SpaceX and ESA launches in the next 24 hours"
                            checked={preferences.digest_launches}
                            disabled={!preferences.daily_digest}
                            onChange={(v) => void updatePreferences({ digest_launches: v })}
                          />
                          <Toggle
                            label="Sky events"
                            description="Meteor showers, full and new Moons, equinoxes"
                            checked={preferences.digest_celestial}
                            disabled={!preferences.daily_digest}
                            onChange={(v) => void updatePreferences({ digest_celestial: v })}
                          />
                          <Toggle
                            label="ISS passes"
                            description={`Naked-eye passes over ${OBSERVER_SHORT_NAME}`}
                            checked={preferences.digest_satellite_passes}
                            disabled={!preferences.daily_digest}
                            onChange={(v) => void updatePreferences({ digest_satellite_passes: v })}
                          />
                        </div>
                      </>
                    ) : (
                      <Skeleton className="h-40 w-full" />
                    )}
                  </section>

                  <section aria-labelledby="saved-title" className="mt-10">
                    <h3 id="saved-title" className="font-display text-xl text-ion">
                      Saved reminders
                    </h3>
                    {loading && reminders.length === 0 ? (
                      <Skeleton className="mt-4 h-24 w-full" />
                    ) : reminders.length === 0 ? (
                      <p className="mt-3 leading-relaxed text-dust">
                        No reminders yet. Use “Remind me” on a launch, a sky event or a satellite to add one.
                      </p>
                    ) : (
                      GROUPS.map(({ kind, title, icon: Icon }) => {
                        const items = reminders.filter((r) => r.kind === kind);
                        if (!items.length) return null;
                        return (
                          <div key={kind} className="mt-5">
                            <p className="flex items-center gap-2 text-sm text-dust">
                              <Icon className="h-4 w-4" /> {title}
                            </p>
                            <ul className="divide-y divide-white/[0.06]">
                              {items.map((r) => (
                                <ReminderRow key={r.id} reminder={r} />
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    )}
                  </section>
                </>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
