import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client for trusted server jobs (the daily reminder cron).
 * Bypasses Row Level Security — never import this into client code.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
