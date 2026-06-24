/**
 * Persistent draft storage via `@tauri-apps/plugin-store` — the same mechanism
 * used for app settings, so drafts land in a real JSON file in the OS
 * app-config directory rather than the volatile WebView storage. This is what
 * lets an unsaved entry survive a crash, a power cut, or quitting the app.
 */
import { load, type Store } from '@tauri-apps/plugin-store';
import type { StoredDraft } from './types';

const STORE_FILE = 'drafts.json';
const KEY = 'drafts';

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  storePromise ??= load(STORE_FILE, { defaults: {}, autoSave: true });
  return storePromise;
}

/** All saved drafts, or an empty list if none / unavailable. */
export async function loadDrafts(): Promise<StoredDraft[]> {
  const store = await getStore();
  return (await store.get<StoredDraft[]>(KEY)) ?? [];
}

/** Overwrite the persisted draft list. */
export async function persistDrafts(drafts: StoredDraft[]): Promise<void> {
  const store = await getStore();
  await store.set(KEY, drafts);
  await store.save();
}
