/**
 * Platform-agnostic storage contract.
 *
 * The app is backed by `.ics` content either way, but the medium differs:
 * on desktop Tauri owns a real file on disk, in the browser IndexedDB owns the
 * data. Everything above this layer (stores, components) talks to a
 * `StorageBackend` and never branches on the platform.
 */

/** Where the diary currently lives. */
export type VaultRef =
  | { kind: 'file'; path: string }
  | { kind: 'browser' };

/** Key-value namespaces mirroring the two Tauri plugin-store files. */
export type StoreName = 'settings' | 'drafts';

export interface StorageBackend {
  readonly kind: 'tauri' | 'web';

  // --- vault lifecycle ----------------------------------------------------
  /** The vault remembered from a previous session, or null. */
  getRememberedVault(): Promise<VaultRef | null>;
  /** Persist the vault to reopen on the next launch; null forgets it. */
  rememberVault(ref: VaultRef | null): Promise<void>;
  /** Whether the vault's data is still present. */
  vaultExists(ref: VaultRef): Promise<boolean>;
  /** Read the raw `.ics` text of a vault. Throws if unreadable. */
  readVault(ref: VaultRef): Promise<string>;
  /** Replace the vault's `.ics` contents (atomically on desktop). */
  writeVault(ref: VaultRef, contents: string): Promise<void>;
  /** Destroy the app-owned copy (browser). External files are left intact. */
  forgetVault(ref: VaultRef): Promise<void>;

  // --- user-facing file flows --------------------------------------------
  /**
   * Ask where a brand-new vault should live. Native save dialog on desktop;
   * the browser has no location to choose, so it yields the browser vault.
   */
  pickVaultLocation(defaultName: string): Promise<VaultRef | null>;
  /** Ask for an `.ics` to import and return its text with its vault ref. */
  pickIcsText(): Promise<{ text: string; ref: VaultRef } | null>;
  /** Read an `.ics` dropped onto the window (desktop only; null elsewhere). */
  readDroppedPath(path: string): Promise<{ text: string; ref: VaultRef } | null>;
  /** Write an `.ics` copy where the user chooses. False when cancelled. */
  saveIcsCopy(contents: string, defaultName: string): Promise<boolean>;

  // --- key-value persistence ---------------------------------------------
  getItem<T>(store: StoreName, key: string): Promise<T | null>;
  setItem<T>(store: StoreName, key: string, value: T): Promise<void>;
  removeItem(store: StoreName, key: string): Promise<void>;
}

/** The `.ics` file name to show for a vault, or null for browser/blank. */
export function vaultFileName(ref: VaultRef | null): string | null {
  if (ref?.kind !== 'file') return null;
  return ref.path.split(/[\\/]/).pop() || ref.path;
}
