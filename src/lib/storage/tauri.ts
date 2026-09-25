/**
 * Desktop backend: `.ics` files on disk via Tauri's official plugins
 * (`@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`), plus key-value
 * persistence through `@tauri-apps/plugin-store`.
 *
 * Writes are atomic: we write a sibling `.tmp` file, then rename it over the
 * original. On a single filesystem the rename is atomic, so a crash mid-write
 * can never corrupt the real diary.
 */
import {
  readTextFile,
  writeTextFile,
  rename,
  remove,
  exists,
} from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { load, type Store } from '@tauri-apps/plugin-store';
import { devError } from '../log';
import type { StorageBackend, StoreName, VaultRef } from './types';

const ICS_FILTERS = [{ name: 'iCalendar', extensions: ['ics'] }];

const STORE_FILES: Record<StoreName, string> = {
  settings: 'settings.json',
  drafts: 'drafts.json',
};
const KEY_VAULT_PATH = 'icsPath';

const stores = new Map<StoreName, Promise<Store>>();

function getStore(name: StoreName): Promise<Store> {
  let promise = stores.get(name);
  if (!promise) {
    // `autoSave` debounces writes to disk for us.
    promise = load(STORE_FILES[name], { defaults: {}, autoSave: true });
    stores.set(name, promise);
  }
  return promise;
}

/** Write `contents` to `path` atomically (.tmp + rename), cleaning up on failure. */
async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp`;
  try {
    await writeTextFile(tmp, contents);
    await rename(tmp, path);
  } catch (err) {
    // Clean up the orphaned temp file; ignore secondary failures.
    try {
      if (await exists(tmp)) await remove(tmp);
    } catch (cleanupErr) {
      devError('writeAtomic: failed to clean up the temp file', cleanupErr);
    }
    throw err;
  }
}

function fileVault(path: string): VaultRef {
  return { kind: 'file', path };
}

export const tauriBackend: StorageBackend = {
  kind: 'tauri',

  async getRememberedVault() {
    const store = await getStore('settings');
    const path = await store.get<string>(KEY_VAULT_PATH);
    return path ? fileVault(path) : null;
  },

  async rememberVault(ref) {
    const store = await getStore('settings');
    if (ref?.kind === 'file') await store.set(KEY_VAULT_PATH, ref.path);
    else await store.delete(KEY_VAULT_PATH);
    await store.save();
  },

  async vaultExists(ref) {
    return ref.kind === 'file' && (await exists(ref.path));
  },

  async readVault(ref) {
    if (ref.kind !== 'file') throw new Error('Tauri backend expects a file vault');
    return readTextFile(ref.path);
  },

  async writeVault(ref, contents) {
    if (ref.kind !== 'file') throw new Error('Tauri backend expects a file vault');
    await writeAtomic(ref.path, contents);
  },

  async forgetVault() {
    // The diary is a real file outside the app; unlinking never deletes it.
  },

  async pickVaultLocation(defaultName) {
    const path = await save({
      defaultPath: defaultName,
      filters: ICS_FILTERS,
      title: 'Create diary vault',
    });
    return path ? fileVault(path) : null;
  },

  async pickIcsText() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: ICS_FILTERS,
      title: 'Import diary (.ics)',
    });
    // `open` returns string | string[] | null depending on options.
    const path = typeof selected === 'string' ? selected : null;
    if (!path) return null;
    return { text: await readTextFile(path), ref: fileVault(path) };
  },

  async readDroppedPath(path) {
    return { text: await readTextFile(path), ref: fileVault(path) };
  },

  async saveIcsCopy(contents, defaultName) {
    const path = await save({
      defaultPath: defaultName,
      filters: ICS_FILTERS,
      title: 'Export diary',
    });
    if (!path) return false;
    await writeAtomic(path, contents);
    return true;
  },

  async getItem<T>(store: StoreName, key: string) {
    return (await (await getStore(store)).get<T>(key)) ?? null;
  },

  async setItem<T>(store: StoreName, key: string, value: T) {
    const s = await getStore(store);
    await s.set(key, value);
    await s.save();
  },

  async removeItem(store: StoreName, key: string) {
    const s = await getStore(store);
    await s.delete(key);
    await s.save();
  },
};
