/** Desktop storage. The selected folder owns the diary, drafts and settings. */
import {
  readTextFile,
  writeTextFile,
  rename,
  remove,
  exists,
} from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { dirname, join } from '@tauri-apps/api/path';
import { devError } from '../log';
import type { StorageBackend, StoreName, VaultRef } from './types';

const ICS_FILTERS = [{ name: 'iCalendar', extensions: ['ics'] }];
const DIARY_FILE = 'diary.ics';
const STORE_FILES: Record<StoreName, string> = {
  settings: 'settings.json',
  drafts: 'drafts.json',
};

let activeFolder: string | null = null;
const pendingWrites = new Map<string, Promise<void>>();

async function pickFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    recursive: true,
    multiple: false,
    fileAccessMode: 'scoped',
    title: 'Choose Icarus data folder',
  });
  return typeof selected === 'string' ? selected : null;
}

async function fileInFolder(folder: string): Promise<{ kind: 'file'; path: string }> {
  return { kind: 'file', path: await join(folder, DIARY_FILE) };
}

async function destinationForImport(text: string): Promise<{ text: string; ref: VaultRef } | null> {
  const folder = await pickFolder();
  if (!folder) return null;
  const ref = await fileInFolder(folder);
  if (await exists(ref.path)) {
    throw new Error('The selected folder already contains diary.ics');
  }
  return { text, ref };
}

function requireFolder(): string {
  if (!activeFolder) throw new Error('Choose a diary folder first');
  return activeFolder;
}

/** Keep the temporary file beside the destination, including on removable media. */
async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp`;
  try {
    await writeTextFile(tmp, contents);
    await rename(tmp, path);
  } catch (err) {
    try {
      if (await exists(tmp)) await remove(tmp);
    } catch (cleanupErr) {
      devError('writeAtomic: failed to clean up the temp file', cleanupErr);
    }
    throw err;
  }
}

async function readStore(path: string): Promise<Record<string, unknown>> {
  if (!(await exists(path))) return {};
  const value: unknown = JSON.parse(await readTextFile(path));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid Icarus store: ${path}`);
  }
  return value as Record<string, unknown>;
}

async function updateStore(
  store: StoreName,
  update: (value: Record<string, unknown>) => void,
): Promise<void> {
  const path = await join(requireFolder(), STORE_FILES[store]);
  const previous = pendingWrites.get(path) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    const value = await readStore(path);
    update(value);
    await writeAtomic(path, JSON.stringify(value));
  });
  pendingWrites.set(path, next);
  try {
    await next;
  } finally {
    if (pendingWrites.get(path) === next) pendingWrites.delete(path);
  }
}

export const tauriBackend: StorageBackend = {
  kind: 'tauri',

  async getRememberedVault() {
    // No path, diary content or preference is stored on the host by Icarus.
    return null;
  },

  async rememberVault(ref) {
    activeFolder = ref?.kind === 'file' ? await dirname(ref.path) : null;
  },

  async vaultExists(ref) {
    return ref.kind === 'file' && (await exists(ref.path));
  },

  async readVault(ref) {
    if (ref.kind !== 'file') throw new Error('Desktop requires a file vault');
    return readTextFile(ref.path);
  },

  async writeVault(ref, contents) {
    if (ref.kind !== 'file') throw new Error('Desktop requires a file vault');
    if ((await dirname(ref.path)) !== requireFolder()) {
      throw new Error('The diary must be inside the selected folder');
    }
    await writeAtomic(ref.path, contents);
  },

  async forgetVault() {
    // Closing a folder never deletes its files.
  },

  async pickVaultLocation() {
    const folder = await pickFolder();
    return folder ? fileInFolder(folder) : null;
  },

  async pickIcsText() {
    const selected = await open({
      multiple: false,
      directory: false,
      fileAccessMode: 'scoped',
      filters: ICS_FILTERS,
      title: 'Import diary (.ics)',
    });
    if (typeof selected !== 'string') return null;
    return destinationForImport(await readTextFile(selected));
  },

  async readDroppedPath(path) {
    return destinationForImport(await readTextFile(path));
  },

  async saveIcsCopy(contents, defaultName) {
    const path = await save({
      defaultPath: defaultName,
      filters: ICS_FILTERS,
      title: 'Export diary',
    });
    if (!path) return false;
    await writeTextFile(path, contents);
    return true;
  },

  async getItem<T>(store: StoreName, key: string) {
    const path = await join(requireFolder(), STORE_FILES[store]);
    await pendingWrites.get(path);
    return ((await readStore(path))[key] as T | undefined) ?? null;
  },

  async setItem<T>(store: StoreName, key: string, value: T) {
    await updateStore(store, (items) => { items[key] = value; });
  },

  async removeItem(store: StoreName, key: string) {
    await updateStore(store, (items) => { delete items[key]; });
  },
};
