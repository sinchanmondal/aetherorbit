'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { formatTime } from '@/lib/format';
import { useNow } from '@/lib/hooks/useNow';
import { useAppStore } from '@/lib/store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import OrbitMark from './OrbitMark';

const LINKS = [
  { href: '#sky', label: 'Sky now' },
  { href: '#tonight', label: 'Tonight' },
  { href: '#launches', label: 'Launches' },
  { href: '#atlas', label: 'Star atlas' },
  { href: '#unexplained', label: 'Unexplained' },
];

export default function Navbar() {
  const now = useNow(1_000);
  const user = useAppStore((s) => s.user);
  const reminders = useAppStore((s) => s.reminders);
  const openAuth = useAppStore((s) => s.openAuth);
  const setRemindersOpen = useAppStore((s) => s.setRemindersOpen);
  const notify = useAppStore((s) => s.notify);

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const activeCount = reminders.filter((r) => r.is_active).length;
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email?.split('@')[0] || 'Account';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAccountOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  async function signOut() {
    setAccountOpen(false);
    await getSupabaseBrowserClient()?.auth.signOut();
    notify('Signed out.', 'info');
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        aria-label="Main"
        className={clsx(
          'mx-auto flex h-14 max-w-[1400px] items-center gap-4 rounded-full px-3 pl-4 transition-[background,border-color,box-shadow] duration-300 sm:pl-5',
          scrolled ? 'glass-strong' : 'border border-transparent',
        )}
      >
        <a href="#top" className="flex items-center gap-2.5 rounded-full pr-2" aria-label="AetherOrbit home">
          <OrbitMark className="h-7 w-7" />
          <span className="font-display text-[1.45rem] font-medium leading-none tracking-[0.01em] text-starlight">
            AetherOrbit
          </span>
        </a>

        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-3 py-1.5 text-sm text-dust transition-colors hover:text-starlight">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1.5">
          <p className="mr-2 hidden text-sm text-dust tabular md:block" aria-label="Indian Standard Time">
            {now ? formatTime(now, { second: '2-digit' }) : '--:--:--'} <span className="text-dust/70">IST</span>
          </p>

          <button
            type="button"
            onClick={() => (user ? setRemindersOpen(true) : openAuth('signin'))}
            className="relative grid h-10 w-10 place-items-center rounded-full text-dust transition-colors hover:bg-white/[0.05] hover:text-starlight"
            aria-label={user ? `Reminders (${activeCount} active)` : 'Reminders'}
          >
            <Bell className="h-[18px] w-[18px]" />
            {activeCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ion px-1 text-[10px] font-semibold text-void tabular">
                {activeCount}
              </span>
            ) : null}
          </button>

          {user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="grid h-10 w-10 place-items-center rounded-full bg-nebula/20 font-display text-lg text-starlight ring-1 ring-nebula/40 transition hover:ring-nebula/70"
                aria-label="Account menu"
              >
                {displayName.charAt(0).toUpperCase()}
              </button>
              <AnimatePresence>
                {accountOpen ? (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                    className="glass-strong absolute right-0 mt-2 w-60 rounded-2xl p-2"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-starlight">{displayName}</p>
                      <p className="truncate text-sm text-dust">{user.email}</p>
                    </div>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        setRemindersOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-starlight hover:bg-white/[0.05]"
                    >
                      <Bell className="h-4 w-4 text-dust" /> Reminders and digest
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={signOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-starlight hover:bg-white/[0.05]"
                    >
                      <LogOut className="h-4 w-4 text-dust" /> Sign out
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="h-10 whitespace-nowrap rounded-full border border-white/10 px-4 text-sm text-starlight transition-colors hover:border-ion/50"
            >
              Sign in
            </button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full text-dust hover:text-starlight lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen ? (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="glass-strong mx-auto mt-2 max-w-[1400px] rounded-3xl p-2 lg:hidden"
          >
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-starlight hover:bg-white/[0.05]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
