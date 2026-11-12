'use client';

import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import type {
  AIDetailLevel,
  AIExplainTarget,
  NewReminderInput,
  Reminder,
  ReminderKind,
  UserPreferences,
} from './types';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

type AuthView = 'signin' | 'signup' | 'magic';

interface AppState {
  // Session
  user: User | null;
  authReady: boolean;
  setUser: (user: User | null) => void;

  // Auth modal
  authOpen: boolean;
  authView: AuthView;
  openAuth: (view?: AuthView) => void;
  closeAuth: () => void;
  setAuthView: (view: AuthView) => void;

  // Reminder centre drawer
  remindersOpen: boolean;
  setRemindersOpen: (open: boolean) => void;

  // AI explainer
  aiTarget: AIExplainTarget | null;
  aiLevel: AIDetailLevel;
  aiCache: Record<string, string>;
  openExplain: (target: AIExplainTarget) => void;
  closeExplain: () => void;
  setAILevel: (level: AIDetailLevel) => void;
  cacheExplanation: (key: string, text: string) => void;

  // Reminders & preferences (server-backed)
  reminders: Reminder[];
  preferences: UserPreferences | null;
  remindersLoading: boolean;
  loadReminders: () => Promise<void>;
  addReminder: (input: NewReminderInput) => Promise<boolean>;
  removeReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string, isActive: boolean) => Promise<void>;
  updatePreferences: (patch: Partial<Omit<UserPreferences, 'user_id'>>, silent?: boolean) => Promise<void>;

  // Toasts
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

const messageOf = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export function isReminderActive(reminders: Reminder[], kind: ReminderKind, targetRef: string): boolean {
  return reminders.some((r) => r.kind === kind && r.target_ref === targetRef && r.is_active);
}

export const useAppStore = create<AppState>()((set, get) => ({
  user: null,
  authReady: false,
  setUser: (user) =>
    set(user ? { user, authReady: true } : { user: null, authReady: true, reminders: [], preferences: null }),

  authOpen: false,
  authView: 'signin',
  openAuth: (view = 'signin') => set({ authOpen: true, authView: view }),
  closeAuth: () => set({ authOpen: false }),
  setAuthView: (authView) => set({ authView }),

  remindersOpen: false,
  setRemindersOpen: (remindersOpen) => set({ remindersOpen }),

  aiTarget: null,
  aiLevel: 'beginner',
  aiCache: {},
  openExplain: (aiTarget) => set({ aiTarget }),
  closeExplain: () => set({ aiTarget: null }),
  setAILevel: (aiLevel) => {
    set({ aiLevel });
    if (get().user) void get().updatePreferences({ ai_detail_level: aiLevel }, true);
  },
  cacheExplanation: (key, text) => set((s) => ({ aiCache: { ...s.aiCache, [key]: text } })),

  reminders: [],
  preferences: null,
  remindersLoading: false,

  loadReminders: async () => {
    if (!get().user) return;
    set({ remindersLoading: true });
    try {
      const data = await api<{ reminders: Reminder[]; preferences: UserPreferences }>('/api/reminders');
      set({
        reminders: data.reminders,
        preferences: data.preferences,
        aiLevel: data.preferences?.ai_detail_level ?? get().aiLevel,
      });
    } catch (e) {
      get().notify(messageOf(e, 'Could not load your reminders.'), 'error');
    } finally {
      set({ remindersLoading: false });
    }
  },

  addReminder: async (input) => {
    if (!get().user) {
      get().openAuth('signin');
      get().notify('Sign in to save reminders.', 'info');
      return false;
    }
    try {
      const { reminder } = await api<{ reminder: Reminder }>('/api/reminders', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      set((s) => ({ reminders: [reminder, ...s.reminders.filter((r) => r.id !== reminder.id)] }));
      get().notify(`Reminder set: ${reminder.label}`, 'success');
      return true;
    } catch (e) {
      get().notify(messageOf(e, 'Could not set the reminder.'), 'error');
      return false;
    }
  },

  removeReminder: async (id) => {
    const previous = get().reminders;
    set({ reminders: previous.filter((r) => r.id !== id) });
    try {
      await api(`/api/reminders?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      get().notify('Reminder removed.', 'info');
    } catch (e) {
      set({ reminders: previous });
      get().notify(messageOf(e, 'Could not remove the reminder.'), 'error');
    }
  },

  toggleReminder: async (id, isActive) => {
    const previous = get().reminders;
    set({ reminders: previous.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)) });
    try {
      await api('/api/reminders', { method: 'PATCH', body: JSON.stringify({ id, isActive }) });
    } catch (e) {
      set({ reminders: previous });
      get().notify(messageOf(e, 'Could not update the reminder.'), 'error');
    }
  },

  updatePreferences: async (patch, silent = false) => {
    const previous = get().preferences;
    if (previous) set({ preferences: { ...previous, ...patch } });
    try {
      const { preferences } = await api<{ preferences: UserPreferences }>('/api/reminders', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      set({ preferences });
      if (!silent) get().notify('Preferences saved.', 'success');
    } catch (e) {
      set({ preferences: previous });
      get().notify(messageOf(e, 'Could not save preferences.'), 'error');
    }
  },

  toasts: [],
  notify: (message, tone = 'info') => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), 4_500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
