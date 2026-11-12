import { NextResponse, type NextRequest } from 'next/server';
import { upcomingCelestialEvents } from '@/lib/celestial';
import { IST_OFFSET_MS, ISS_NORAD_ID, OBSERVER } from '@/lib/config';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchLaunches, fetchVisualPasses } from '@/lib/server/sources';
import type { CelestialEvent, Launch, ReminderKind, VisualPass } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/daily-digest
 *
 * Runs once a day (06:00 IST via vercel.json). For each user with the daily
 * digest on or with active reminders, it gathers:
 *   - launches they asked about (and, if subscribed, all tracked launches in the next 24 h)
 *   - sky events in the next 48 h
 *   - visible passes for satellites they follow (ISS by default)
 * then sends one email via Resend. Idempotent per user per day.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically).
 * Add `?dryRun=1` to build digests without sending.
 */

interface PreferenceRow {
  user_id: string;
  daily_digest: boolean;
  digest_launches: boolean;
  digest_celestial: boolean;
  digest_satellite_passes: boolean;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
}

interface ReminderRow {
  id: string;
  user_id: string;
  kind: ReminderKind;
  target_ref: string;
  label: string;
  event_at: string | null;
}

interface DigestItem {
  section: 'Launches' | 'Sky events' | 'Satellite passes';
  title: string;
  when: string;
  detail: string;
  sortKey: number;
}

const HOUR = 3_600_000;
const PAGE = 1_000;
const MAX_TRACKED_SATELLITES = 15;

type PageResult = { data: unknown[] | null; error: { message: string } | null };

async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<PageResult>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

const ist = (iso: string, withDate = true) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    ...(withDate ? { weekday: 'short', day: 'numeric', month: 'short' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso)) + ' IST';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function launchItem(l: Launch): DigestItem {
  return {
    section: 'Launches',
    title: l.missionName,
    when: ist(l.net),
    detail: [l.rocket, l.provider, l.location].filter(Boolean).join(', ') + ` (status: ${l.status})`,
    sortKey: Date.parse(l.net),
  };
}

function eventItem(e: CelestialEvent): DigestItem {
  return { section: 'Sky events', title: e.title, when: ist(e.date), detail: `${e.description} ${e.viewingTip}`, sortKey: Date.parse(e.date) };
}

function passItem(p: VisualPass): DigestItem {
  return {
    section: 'Satellite passes',
    title: p.satelliteName,
    when: `${ist(p.start)} – ${ist(p.end, false)}`,
    detail: `Rises ${p.startCompass}, peaks ${p.maxElevation}° ${p.peakCompass}, sets ${p.endCompass}${
      p.magnitude !== null ? `, brightness ${p.magnitude.toFixed(1)} mag` : ''
    }.`,
    sortKey: Date.parse(p.start),
  };
}

function renderEmail(name: string | null, items: DigestItem[], siteUrl: string): { subject: string; html: string } {
  const sections: DigestItem['section'][] = ['Launches', 'Sky events', 'Satellite passes'];
  const blocks = sections
    .map((section) => {
      const rows = items.filter((i) => i.section === section).sort((a, b) => a.sortKey - b.sortKey);
      if (!rows.length) return '';
      return `
        <tr><td style="padding:28px 0 8px;font:600 18px Georgia,serif;color:#E8ECF5;">${section}</td></tr>
        ${rows
          .map(
            (r) => `
        <tr><td style="padding:12px 0;border-top:1px solid #1E2438;">
          <div style="font:600 15px Arial,sans-serif;color:#E8ECF5;">${escapeHtml(r.title)}</div>
          <div style="font:14px Arial,sans-serif;color:#5CE1E6;margin-top:2px;">${escapeHtml(r.when)}</div>
          <div style="font:14px/1.5 Arial,sans-serif;color:#8A93A8;margin-top:4px;">${escapeHtml(r.detail)}</div>
        </td></tr>`,
          )
          .join('')}`;
    })
    .join('');

  const count = items.length;
  const subject = `Today over ${OBSERVER.name.split(',')[0]}: ${count} ${count === 1 ? 'thing' : 'things'} to watch`;
  const html = `<!doctype html><html><body style="margin:0;background:#07080D;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07080D;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="font:500 28px Georgia,serif;color:#E8ECF5;">AetherOrbit</td></tr>
        <tr><td style="padding-top:8px;font:15px/1.6 Arial,sans-serif;color:#8A93A8;">
          ${name ? `Good morning, ${escapeHtml(name)}. ` : 'Good morning. '}Here's what's happening in the sky over ${escapeHtml(OBSERVER.name)}.
        </td></tr>
        ${blocks}
        <tr><td style="padding-top:32px;font:13px/1.6 Arial,sans-serif;color:#5d6478;">
          Times are in IST. Launch times often slip, so check the live dashboard before heading out.<br/>
          <a href="${siteUrl}" style="color:#5CE1E6;">Open AetherOrbit</a> to manage your reminders.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
  return { subject, html };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM_EMAIL || 'AetherOrbit <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' }, { status: 503 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1' || !process.env.RESEND_API_KEY;
  const now = new Date();
  const nowMs = now.getTime();
  const digestDate = new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  try {
    // 1. Who might get a digest?
    const [preferences, reminders] = await Promise.all([
      fetchAllRows<PreferenceRow>((from, to) =>
        admin
          .from('user_preferences')
          .select('user_id, daily_digest, digest_launches, digest_celestial, digest_satellite_passes')
          .range(from, to),
      ),
      fetchAllRows<ReminderRow>((from, to) =>
        admin.from('reminders').select('id, user_id, kind, target_ref, label, event_at').eq('is_active', true).range(from, to),
      ),
    ]);

    const prefsByUser = new Map(preferences.map((p) => [p.user_id, p]));
    const remindersByUser = new Map<string, ReminderRow[]>();
    for (const r of reminders) remindersByUser.set(r.user_id, [...(remindersByUser.get(r.user_id) ?? []), r]);

    const userIds = [
      ...new Set([...preferences.filter((p) => p.daily_digest).map((p) => p.user_id), ...remindersByUser.keys()]),
    ];
    if (!userIds.length) return NextResponse.json({ digestDate, processed: 0, sent: 0, dryRun });

    // 2. Profiles and today's existing deliveries
    const profiles = new Map<string, ProfileRow>();
    for (let i = 0; i < userIds.length; i += 200) {
      const chunk = userIds.slice(i, i + 200);
      const { data, error } = await admin.from('profiles').select('id, email, display_name').in('id', chunk);
      if (error) throw new Error(error.message);
      for (const p of (data ?? []) as ProfileRow[]) profiles.set(p.id, p);
    }

    const { data: delivered } = await admin
      .from('reminder_deliveries')
      .select('user_id')
      .eq('digest_date', digestDate)
      .eq('status', 'sent');
    const alreadySent = new Set(((delivered ?? []) as Array<{ user_id: string }>).map((d) => d.user_id));

    // 3. Shared data, fetched once
    const satelliteIds = new Set<number>([ISS_NORAD_ID]);
    for (const r of reminders) {
      if (r.kind !== 'satellite_pass') continue;
      const id = Number(r.target_ref.split('@')[0]);
      if (Number.isInteger(id) && id > 0 && satelliteIds.size < MAX_TRACKED_SATELLITES) satelliteIds.add(id);
    }

    const [launchResult, passEntries] = await Promise.all([
      fetchLaunches(now),
      Promise.all(
        [...satelliteIds].map(async (id) => {
          const label = reminders.find((r) => r.kind === 'satellite_pass' && r.target_ref.split('@')[0] === String(id))?.label;
          const result = await fetchVisualPasses(id, id === ISS_NORAD_ID ? 'ISS' : (label ?? `NORAD ${id}`), 2, 60);
          // Never email simulated passes.
          return [id, result.status.source === 'live' ? result.data : []] as const;
        }),
      ),
    ]);
    const launches = launchResult.status.source === 'live' ? launchResult.data : [];
    const launchById = new Map(launches.map((l) => [l.id, l]));
    const passesBySatellite = new Map<number, VisualPass[]>(passEntries);
    const events = upcomingCelestialEvents(now, 3);

    const within = (iso: string | null, hours: number) => {
      if (!iso) return false;
      const t = Date.parse(iso);
      return t >= nowMs - HOUR && t <= nowMs + hours * HOUR;
    };

    // 4. Build and send
    const summary = { digestDate, dryRun, processed: 0, sent: 0, skipped: 0, failed: 0, previews: [] as unknown[] };
    const notifiedReminderIds: string[] = [];

    for (const userId of userIds) {
      summary.processed += 1;
      const profile = profiles.get(userId);
      if (!profile?.email || alreadySent.has(userId)) {
        summary.skipped += 1;
        continue;
      }

      const prefs = prefsByUser.get(userId);
      const userReminders = remindersByUser.get(userId) ?? [];
      const items: DigestItem[] = [];
      const seen = new Set<string>();
      const add = (key: string, item: DigestItem, reminderId?: string) => {
        if (seen.has(key)) return;
        seen.add(key);
        items.push(item);
        if (reminderId) notifiedReminderIds.push(reminderId);
      };

      for (const r of userReminders) {
        if (r.kind === 'launch') {
          const launch = launchById.get(r.target_ref);
          if (launch && within(launch.net, 36)) add(`launch:${launch.id}`, launchItem(launch), r.id);
        } else if (r.kind === 'celestial_event') {
          const event = events.find((e) => e.id === r.target_ref);
          if (event && within(event.date, 48)) add(`event:${event.id}`, eventItem(event), r.id);
          else if (!event && within(r.event_at, 48) && r.event_at) {
            add(`event:${r.target_ref}`, { section: 'Sky events', title: r.label, when: ist(r.event_at), detail: '', sortKey: Date.parse(r.event_at) }, r.id);
          }
        } else if (r.kind === 'satellite_pass') {
          const [idPart, specific] = r.target_ref.split('@');
          const passes = passesBySatellite.get(Number(idPart)) ?? [];
          for (const p of passes) {
            if (!within(p.start, 24)) continue;
            if (specific && Math.abs(Date.parse(p.start) - Date.parse(specific)) > 10 * 60_000) continue;
            add(`pass:${p.noradId}:${p.start}`, passItem(p), r.id);
          }
        }
      }

      if (prefs?.daily_digest) {
        if (prefs.digest_launches) {
          for (const l of launches) if (!l.agencies.includes('Global') && within(l.net, 24)) add(`launch:${l.id}`, launchItem(l));
        }
        if (prefs.digest_celestial) {
          for (const e of events) if (within(e.date, 48)) add(`event:${e.id}`, eventItem(e));
        }
        if (prefs.digest_satellite_passes) {
          for (const p of passesBySatellite.get(ISS_NORAD_ID) ?? []) if (within(p.start, 24)) add(`pass:${p.noradId}:${p.start}`, passItem(p));
        }
      }

      if (!items.length) {
        summary.skipped += 1;
        continue;
      }

      const { subject, html } = renderEmail(profile.display_name, items, siteUrl);

      if (dryRun) {
        summary.previews.push({ userId, to: profile.email, subject, items: items.map(({ sortKey: _s, ...rest }) => rest) });
        continue;
      }

      try {
        await sendEmail(profile.email, subject, html);
        summary.sent += 1;
        await admin
          .from('reminder_deliveries')
          .upsert(
            { user_id: userId, digest_date: digestDate, channel: 'email', status: 'sent', item_count: items.length, error: null },
            { onConflict: 'user_id,digest_date,channel' },
          );
      } catch (e) {
        summary.failed += 1;
        await admin.from('reminder_deliveries').upsert(
          {
            user_id: userId,
            digest_date: digestDate,
            channel: 'email',
            status: 'failed',
            item_count: items.length,
            error: e instanceof Error ? e.message.slice(0, 500) : 'Unknown error',
          },
          { onConflict: 'user_id,digest_date,channel' },
        );
      }
    }

    // 5. Bookkeeping
    if (!dryRun && notifiedReminderIds.length) {
      for (let i = 0; i < notifiedReminderIds.length; i += 500) {
        await admin
          .from('reminders')
          .update({ last_notified_at: now.toISOString() })
          .in('id', notifiedReminderIds.slice(i, i + 500));
      }
    }
    if (!dryRun) {
      // Retire one-off reminders whose moment has passed.
      await admin
        .from('reminders')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('kind', 'satellite_pass')
        .lt('event_at', new Date(nowMs - 12 * HOUR).toISOString());
    }

    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Digest run failed.' }, { status: 500 });
  }
}
