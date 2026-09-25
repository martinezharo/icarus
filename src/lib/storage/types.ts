/**
 * Platform-agnostic storage contract.
 *
 * The app is backed by `.ics` content either way, but the medium differs:
 * on desktop a user-selected folder owns the diary and settings, while in the
 * browser IndexedDB owns the data. Everything above this layer talks to a
 * `StorageBackend` and never branches on the platform.
 */

/** Where the diary currently lives. */
export type VaultRef =
  | { kind: 'file'; path: string }
  | { kind: 'browser' };

/** Key-value namespaces for folder JSON files or browser IndexedDB stores. */
export type StoreName = 'settings' | 'drafts';

export interface StorageBackend {
  readonly kind: 'tauri' | 'web';

  // --- vault lifecycle ----------------------------------------------------
  /** The vault available on boot, or null until a desktop folder is chosen. */
  getRememberedVault(): Promise<VaultRef | null>;
  /** Select the active vault for this session; desktop never remembers its path. */
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
