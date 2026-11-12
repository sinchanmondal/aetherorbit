import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES = {
  daily_digest: true,
  digest_launches: true,
  digest_celestial: true,
  digest_satellite_passes: true,
  favorite_satellites: [] as number[],
  favorite_constellations: [] as string[],
  ai_detail_level: 'beginner' as const,
};

const createSchema = z.object({
  kind: z.enum(['launch', 'celestial_event', 'satellite_pass']),
  targetRef: z.string().trim().min(1).max(160),
  label: z.string().trim().min(1).max(200),
  eventAt: z.string().datetime({ offset: true }).nullish(),
  metadata: z.record(z.unknown()).optional(),
});

const toggleSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

const preferencesSchema = z
  .object({
    daily_digest: z.boolean(),
    digest_launches: z.boolean(),
    digest_celestial: z.boolean(),
    digest_satellite_passes: z.boolean(),
    favorite_satellites: z.array(z.number().int().nonnegative()).max(50),
    favorite_constellations: z.array(z.string().max(40)).max(50),
    ai_detail_level: z.enum(['beginner', 'enthusiast']),
  })
  .partial()
  .strict();

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function authorise() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: json({ error: 'Accounts are not configured on this server yet.' }, 503) } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: json({ error: 'Sign in to manage reminders.' }, 401) } as const;
  return { supabase, user } as const;
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** GET — the signed-in user's reminders and saved preferences */
export async function GET() {
  const ctx = await authorise();
  if ('error' in ctx) return ctx.error;
  const { supabase, user } = ctx;

  const [reminders, prefs] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('event_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  if (reminders.error) return json({ error: 'Could not load reminders.' }, 500);

  let preferences = prefs.data;
  if (!preferences) {
    // Accounts created before the schema was applied: create the rows now.
    await supabase.from('profiles').upsert({ id: user.id, email: user.email }, { onConflict: 'id' });
    const created = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' })
      .select('*')
      .single();
    preferences = created.data ?? { user_id: user.id, ...DEFAULT_PREFERENCES };
  }

  return json({ reminders: reminders.data ?? [], preferences });
}

/** POST — create (or re-activate) a reminder */
export async function POST(request: NextRequest) {
  const ctx = await authorise();
  if ('error' in ctx) return ctx.error;
  const { supabase, user } = ctx;

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid reminder.' }, 400);
  const { kind, targetRef, label, eventAt, metadata } = parsed.data;

  const { data, error } = await supabase
    .from('reminders')
    .upsert(
      {
        user_id: user.id,
        kind,
        target_ref: targetRef,
        label,
        event_at: eventAt ?? null,
        metadata: metadata ?? {},
        is_active: true,
      },
      { onConflict: 'user_id,kind,target_ref' },
    )
    .select('*')
    .single();

  if (error) return json({ error: 'Could not save the reminder.' }, 500);
  return json({ reminder: data }, 201);
}

/** PATCH — pause or resume a reminder */
export async function PATCH(request: NextRequest) {
  const ctx = await authorise();
  if ('error' in ctx) return ctx.error;
  const { supabase, user } = ctx;

  const parsed = toggleSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, 400);

  const { data, error } = await supabase
    .from('reminders')
    .update({ is_active: parsed.data.isActive })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (error) return json({ error: 'Could not update the reminder.' }, 500);
  if (!data) return json({ error: 'Reminder not found.' }, 404);
  return json({ reminder: data });
}

/** PUT — update saved preferences (partial) */
export async function PUT(request: NextRequest) {
  const ctx = await authorise();
  if ('error' in ctx) return ctx.error;
  const { supabase, user } = ctx;

  const parsed = preferencesSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid preferences.' }, 400);

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) return json({ error: 'Could not save preferences.' }, 500);
  return json({ preferences: data });
}

/** DELETE ?id=<uuid> — remove a reminder */
export async function DELETE(request: NextRequest) {
  const ctx = await authorise();
  if ('error' in ctx) return ctx.error;
  const { supabase, user } = ctx;

  const id = request.nextUrl.searchParams.get('id');
  if (!id || !z.string().uuid().safeParse(id).success) return json({ error: 'A valid reminder id is required.' }, 400);

  const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', user.id);
  if (error) return json({ error: 'Could not delete the reminder.' }, 500);
  return json({ ok: true });
}
