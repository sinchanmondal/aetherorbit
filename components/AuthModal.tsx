'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, MailCheck, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState, type FormEvent } from 'react';
import { useOverlay } from '@/lib/hooks/useOverlay';
import { useAppStore } from '@/lib/store';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import OrbitMark from './OrbitMark';
import { Button } from './ui';

const COPY = {
  signin: { title: 'Sign in to AetherOrbit', submit: 'Sign in' },
  signup: { title: 'Create your account', submit: 'Create account' },
  magic: { title: 'Get a sign-in link', submit: 'Email me a link' },
} as const;

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'That email and password don’t match an account.';
  if (m.includes('email not confirmed')) return 'Confirm your email first. Check your inbox for the link we sent.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Sign in instead.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('password')) return message;
  return message || 'Something went wrong. Try again.';
}

export default function AuthModal() {
  const open = useAppStore((s) => s.authOpen);
  const view = useAppStore((s) => s.authView);
  const setView = useAppStore((s) => s.setAuthView);
  const close = useAppStore((s) => s.closeAuth);
  const notify = useAppStore((s) => s.notify);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useOverlay(open, close);

  useEffect(() => {
    setError(null);
    setSentTo(null);
  }, [view, open]);

  const configured = isSupabaseConfigured();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setError(null);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (view === 'signup' && password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }

    setLoading(true);
    try {
      if (view === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (err) throw err;
        notify('Signed in.', 'success');
        close();
      } else if (view === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: displayName.trim() ? { display_name: displayName.trim().slice(0, 80) } : undefined,
          },
        });
        if (err) throw err;
        if (data.session) {
          notify('Account created. Welcome aboard.', 'success');
          close();
        } else {
          setSentTo(trimmedEmail);
        }
      } else {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
        });
        if (err) throw err;
        setSentTo(trimmedEmail);
      }
      setPassword('');
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-starlight placeholder:text-dust/60 outline-none transition focus:border-ion/60 focus:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ion/40';

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[75] grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-void/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong relative w-full max-w-md rounded-[28px] p-7 sm:p-9"
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-dust hover:bg-white/[0.05] hover:text-starlight"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <OrbitMark className="h-10 w-10" />
            <h2 id="auth-title" className="mt-4 font-display text-3xl font-medium text-starlight">
              {COPY[view].title}
            </h2>
            <p className="mt-2 text-dust">Save reminders for launches, sky events and satellite passes, and get a daily digest.</p>

            {!configured ? (
              <div className="mt-6 rounded-2xl border border-flare/30 bg-flare/[0.06] p-4 text-sm leading-relaxed text-starlight">
                Accounts aren&apos;t set up on this deployment. Add <code className="text-flare">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                <code className="text-flare">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, run{' '}
                <code>supabase/schema.sql</code>, then restart.
              </div>
            ) : sentTo ? (
              <div className="mt-6 rounded-2xl border border-ion/30 bg-ion/[0.06] p-5">
                <MailCheck className="h-6 w-6 text-ion" />
                <p className="mt-3 text-starlight">Check your inbox</p>
                <p className="mt-1 text-sm leading-relaxed text-dust">
                  We sent a link to <span className="text-starlight">{sentTo}</span>. Open it on this device to{' '}
                  {view === 'signup' ? 'confirm your account and sign in' : 'sign in'}.
                </p>
                <button type="button" onClick={() => setSentTo(null)} className="mt-4 text-sm text-ion hover:text-starlight">
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {view !== 'magic' ? (
                  <div role="tablist" aria-label="Account" className="mt-6 grid grid-cols-2 rounded-full border border-white/10 p-1">
                    {(['signin', 'signup'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="tab"
                        aria-selected={view === v}
                        onClick={() => setView(v)}
                        className={clsx(
                          'relative h-9 rounded-full text-sm transition-colors',
                          view === v ? 'text-void' : 'text-dust hover:text-starlight',
                        )}
                      >
                        {view === v ? (
                          <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-starlight" transition={{ duration: 0.22 }} />
                        ) : null}
                        <span className="relative">{v === 'signin' ? 'Sign in' : 'Create account'}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  {view === 'signup' ? (
                    <div>
                      <label htmlFor="auth-name" className="mb-1.5 block text-sm text-dust">
                        Name <span className="text-dust/60">(optional)</span>
                      </label>
                      <input
                        id="auth-name"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={inputClass}
                        placeholder="What should we call you?"
                      />
                    </div>
                  ) : null}

                  <div>
                    <label htmlFor="auth-email" className="mb-1.5 block text-sm text-dust">
                      Email
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>

                  {view !== 'magic' ? (
                    <div>
                      <label htmlFor="auth-password" className="mb-1.5 block text-sm text-dust">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                          required
                          minLength={view === 'signup' ? 8 : undefined}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={clsx(inputClass, 'pr-12')}
                          placeholder={view === 'signup' ? 'At least 8 characters' : 'Your password'}
                          aria-describedby={error ? 'auth-error' : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-dust hover:text-starlight"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <p id="auth-error" role="alert" className="text-sm text-ember">
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={loading}
                    icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                  >
                    {COPY[view].submit}
                  </Button>
                </form>

                <p className="mt-5 text-center text-sm text-dust">
                  {view === 'magic' ? (
                    <button type="button" onClick={() => setView('signin')} className="text-ion hover:text-starlight">
                      Sign in with a password instead
                    </button>
                  ) : (
                    <button type="button" onClick={() => setView('magic')} className="text-ion hover:text-starlight">
                      Email me a sign-in link instead
                    </button>
                  )}
                </p>
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
