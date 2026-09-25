/**
 * Picks the storage backend once, at module load:
 *  - Tauri desktop → `.ics` files on disk (`./tauri.ts`).
 *  - Plain browser → IndexedDB (`./web.ts`), still exportable as `.ics`.
 *
 * Consumers import `storage` and stay platform-agnostic.
 */
import { isTauri } from '@tauri-apps/api/core';
import { tauriBackend } from './tauri';
import { webBackend } from './web';
import type { StorageBackend } from './types';

function runningUnderTauri(): boolean {
  if (isTauri()) return true;
  // Belt and braces: `__TAURI_INTERNALS__` is the object every Tauri API calls
  // into, so its presence is a reliable signal even without the helper.
  return '__TAURI_INTERNALS__' in globalThis;
}

export const storage: StorageBackend = runningUnderTauri()
  ? tauriBackend
  : webBackend;

export type { StorageBackend, StoreName, VaultRef } from './types';
export { vaultFileName } from './types';
