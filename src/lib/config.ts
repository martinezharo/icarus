/**
 * Persistent app configuration via `@tauri-apps/plugin-store`. We only persist
 * the path of the last-opened `.ics` file so the app can reopen the user's
 * vault on next launch. The store lives in the OS app-config directory.
 */
import { load, type Store } from '@tauri-apps/plugin-store';
import type { WeekStart } from './date';

export type { WeekStart };

const STORE_FILE = 'settings.json';
const KEY_PATH = 'icsPath';
const KEY_WEEK_START = 'weekStart';
const KEY_SPELLCHECK = 'spellcheck';
const KEY_SPELL_WORDS = 'spellWords';

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  // `autoSave` debounces writes to disk for us.
  storePromise ??= load(STORE_FILE, { defaults: {}, autoSave: true });
  return storePromise;
}

/** The remembered `.ics` path, or null if the user hasn't chosen one. */
export async function getSavedIcsPath(): Promise<string | null> {
  const store = await getStore();
  const path = await store.get<string>(KEY_PATH);
  return path ?? null;
}

export async function setSavedIcsPath(path: string): Promise<void> {
  const store = await getStore();
  await store.set(KEY_PATH, path);
  await store.save();
}

export async function clearSavedIcsPath(): Promise<void> {
  const store = await getStore();
  await store.delete(KEY_PATH);
  await store.save();
}

/** The preferred first day of the week (defaults to Monday). */
export async function getSavedWeekStart(): Promise<WeekStart> {
  const store = await getStore();
  const value = await store.get<WeekStart>(KEY_WEEK_START);
  return value === 0 ? 0 : 1;
}

export async function setSavedWeekStart(weekStart: WeekStart): Promise<void> {
  const store = await getStore();
  await store.set(KEY_WEEK_START, weekStart);
  await store.save();
}

/**
 * Whether native spell-check highlighting is on. Defaults to `true` — the OS
 * webview already underlines misspellings, so the user has to opt out.
 */
export async function getSavedSpellcheck(): Promise<boolean> {
  const store = await getStore();
  const value = await store.get<boolean>(KEY_SPELLCHECK);
  return value !== false;
}

export async function setSavedSpellcheck(enabled: boolean): Promise<void> {
  const store = await getStore();
  await store.set(KEY_SPELLCHECK, enabled);
  await store.save();
}

/** The user's personal spell-check dictionary (words they added manually). */
export async function getSavedSpellWords(): Promise<string[]> {
  const store = await getStore();
  const value = await store.get<string[]>(KEY_SPELL_WORDS);
  return Array.isArray(value)
    ? value.filter((word) => typeof word === 'string')
    : [];
}

export async function setSavedSpellWords(words: string[]): Promise<void> {
  const store = await getStore();
  await store.set(KEY_SPELL_WORDS, words);
  await store.save();
}
