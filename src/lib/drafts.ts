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

/** Put the newest snapshot first and keep only one draft per edited entry. */
export function upsertDraft(
  drafts: StoredDraft[],
  draft: StoredDraft,
): StoredDraft[] {
  return [
    draft,
    ...drafts.filter(
      (candidate) =>
        candidate.id !== draft.id &&
        (!draft.editingUid || candidate.editingUid !== draft.editingUid),
    ),
  ];
}

/** Find a previously autosaved revision of a committed entry. */
export function findEntryDraft(
  drafts: StoredDraft[],
  editingUid: string,
): StoredDraft | undefined {
  return drafts.find((draft) => draft.editingUid === editingUid);
}

/**
 * Serialize store writes so a slow older save can never overwrite a newer one.
 * A failed write does not poison the queue: the next snapshot is still tried.
 */
export function createDraftPersistenceQueue(
  write: (drafts: StoredDraft[]) => Promise<void>,
): (drafts: StoredDraft[]) => Promise<void> {
  let tail = Promise.resolve();

  return (drafts) => {
    const snapshot = drafts.map((draft) => ({ ...draft }));
    const next = tail.catch(() => undefined).then(() => write(snapshot));
    tail = next;
    return next;
  };
}
