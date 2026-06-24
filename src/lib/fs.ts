/**
 * Native filesystem + dialog access via Tauri's official plugins
 * (`@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`).
 *
 * The data file lives OUTSIDE the app. Writes are atomic: we write a sibling
 * `.tmp` file, then rename it over the original. On a single filesystem the
 * rename is atomic, so a crash mid-write can never corrupt the real diary.
 */
import {
  readTextFile,
  writeTextFile,
  rename,
  remove,
  exists,
} from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';

const ICS_FILTERS = [{ name: 'iCalendar', extensions: ['ics'] }];

/** Native "open file" dialog. Returns the chosen path, or null if cancelled. */
export async function pickIcsToOpen(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: ICS_FILTERS,
    title: 'Open diary (.ics)',
  });
  // `open` returns string | string[] | null depending on options.
  return typeof selected === 'string' ? selected : null;
}

/** Native "save as" dialog. Returns the chosen path, or null if cancelled. */
export async function pickIcsToSave(
  defaultName = 'icarus-diary.ics',
): Promise<string | null> {
  const path = await save({
    defaultPath: defaultName,
    filters: ICS_FILTERS,
    title: 'Export diary',
  });
  return path ?? null;
}

/** Read a file's text contents. Throws on failure (caller decides UX). */
export async function readIcs(path: string): Promise<string> {
  return readTextFile(path);
}

/**
 * Atomically write `contents` to `path`.
 *
 * Strategy: write `path.tmp` → rename over `path`. If anything fails we make a
 * best-effort attempt to clean up the temp file and re-throw so the caller can
 * tell the user the save did not happen (their in-memory data is untouched).
 */
export async function writeIcsAtomic(
  path: string,
  contents: string,
): Promise<void> {
  const tmp = `${path}.tmp`;
  try {
    await writeTextFile(tmp, contents);
    await rename(tmp, path);
  } catch (err) {
    // Clean up the orphaned temp file; ignore secondary failures.
    try {
      if (await exists(tmp)) await remove(tmp);
    } catch {
      /* nothing more we can safely do */
    }
    throw err;
  }
}

export { exists };
