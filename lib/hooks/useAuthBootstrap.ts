'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/** Subscribes the store to Supabase auth state and loads reminders once signed in. */
export function useAuthBootstrap() {
  const setUser = useAppStore((s) => s.setUser);
  const loadReminders = useAppStore((s) => s.loadReminders);
  const userId = useAppStore((s) => s.user?.id ?? null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setUser(null);
      return;
    }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [setUser]);

  useEffect(() => {
    if (userId) void loadReminders();
  }, [userId, loadReminders]);
}
