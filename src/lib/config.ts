/**
 * Persistent app configuration via `@tauri-apps/plugin-store`. We only persist
 * the path of the last-opened `.ics` file so the app can reopen the user's
 * vault on next launch. The store lives in the OS app-config directory.
 */
import { load, type Store } from '@tauri-apps/plugin-store';

const STORE_FILE = 'settings.json';
const KEY_PATH = 'icsPath';

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
