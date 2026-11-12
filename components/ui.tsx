'use client';

import { clsx } from 'clsx';
import { CircleAlert, Radio } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Agency, SourceStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'ghost' | 'quiet';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ion text-void hover:bg-[#7DEAEE] shadow-[0_0_24px_-6px_rgba(92,225,230,0.7)] disabled:bg-ion/40 disabled:shadow-none',
  ghost: 'border border-white/10 bg-white/[0.03] text-starlight hover:border-ion/40 hover:bg-ion/[0.06]',
  quiet: 'text-dust hover:text-starlight hover:bg-white/[0.04]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
  md: 'h-11 gap-2 px-5 text-[0.95rem]',
};

export function Button({ variant = 'ghost', size = 'md', icon, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section header — serif title, plain description, optional controls
// ---------------------------------------------------------------------------
export function SectionHeader({
  id,
  title,
  description,
  aside,
}: {
  id: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <h2 id={id} className="font-display text-[2.5rem] font-medium leading-[1.05] text-starlight sm:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-prose text-[1.05rem] leading-relaxed text-dust">{description}</p>
      </div>
      {aside ? <div className="lg:col-span-5 lg:justify-self-end">{aside}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data provenance note — only renders when data is simulated or degraded
// ---------------------------------------------------------------------------
export function SourceNote({ status, className }: { status?: SourceStatus; className?: string }) {
  if (!status || (status.source === 'live' && !status.message)) return null;
  const simulated = status.source === 'mock';
  return (
    <p
      className={clsx(
        'flex items-start gap-2 text-sm leading-snug',
        simulated && !status.ok ? 'text-flare' : 'text-dust',
        className,
      )}
    >
      {simulated ? (
        <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
      ) : (
        <Radio aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
      )}
      <span>{status.message ?? 'Showing simulated data.'}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={clsx('flex items-start justify-between gap-4', disabled && 'opacity-50')}>
      <span>
        <span className="block text-starlight">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-dust">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative mt-0.5 inline-flex h-6 w-11 flex-none items-center rounded-full border transition-colors',
          checked ? 'border-ion/60 bg-ion/30' : 'border-white/10 bg-white/[0.04]',
        )}
      >
        <span
          className={clsx(
            'inline-block h-4 w-4 rounded-full transition-transform duration-200',
            checked ? 'translate-x-[1.4rem] bg-ion shadow-[0_0_12px_rgba(92,225,230,0.8)]' : 'translate-x-1 bg-dust',
          )}
        />
      </button>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Loading placeholder
// ---------------------------------------------------------------------------
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('skeleton', className)} />;
}

// ---------------------------------------------------------------------------
// Agency tag — each agency gets its own signal colour
// ---------------------------------------------------------------------------
const agencyColour: Record<Agency, string> = {
  NASA: 'bg-ion',
  ISRO: 'bg-flare',
  SpaceX: 'bg-starlight',
  ESA: 'bg-nebula',
  Global: 'bg-dust',
};

export function AgencyTag({ agency }: { agency: Agency }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-starlight/90">
      <span aria-hidden className={clsx('h-1.5 w-1.5 rounded-full', agencyColour[agency])} />
      {agency === 'Global' ? 'Other' : agency}
    </span>
  );
}

export function agencyDotClass(agency: Agency) {
  return agencyColour[agency];
}
