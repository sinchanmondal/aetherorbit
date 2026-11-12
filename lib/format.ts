import { IST_OFFSET_MS } from './config';

const TZ = 'Asia/Kolkata';

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTime(value: string | number | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false, ...opts }).format(d);
}

export function formatDate(
  value: string | number | Date,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(d);
}

export function formatDateTime(value: string | number | Date): string {
  return `${formatDate(value, { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatTime(value)}`;
}

/** "Tonight", "Tomorrow" or a short date, relative to IST calendar days */
export function relativeDay(value: string | number | Date, nowMs: number): string {
  const d = toDate(value);
  if (!d) return '—';
  const day = (ms: number) => Math.floor((ms + IST_OFFSET_MS) / 86_400_000);
  const diff = day(d.getTime()) - day(nowMs);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function countdown(targetMs: number, nowMs: number): string {
  let diff = targetMs - nowMs;
  const past = diff < 0;
  diff = Math.abs(diff);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const body = d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  return past ? `T+ ${body}` : `T− ${body}`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m} min ${s ? `${s} s` : ''}`.trim() : `${s} s`;
}
