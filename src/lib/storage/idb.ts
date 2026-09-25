/**
 * Minimal promise wrapper over IndexedDB, used by the browser backend.
 *
 * IndexedDB (not localStorage) because diaries can span years: it stores
 * structured values without the ~5 MB string-only cap, is asynchronous so it
 * never blocks typing, and transactions keep writes consistent.
 */
import type { StoreName } from './types';

const DB_NAME = 'icarus-diary';
const DB_VERSION = 1;
const VAULT_STORE = 'vault';

const STORES: readonly (StoreName | 'vault')[] = [
  'vault',
  'settings',
  'drafts',
];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

/**
 * Run one request and resolve once its transaction has committed, so a
 * resolved write is guaranteed durable rather than merely queued.
 */
async function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = op(tx.objectStore(storeName));
    let result: T;
    request.onsuccess = () => {
      result = request.result as T;
    };
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB aborted'));
  });
}

export function idbGet<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>(VAULT_STORE, 'readonly', (store) => store.get(key));
}

export function idbSet(key: string, value: unknown): Promise<void> {
  return run<void>(VAULT_STORE, 'readwrite', (store) => store.put(value, key));
}

export function idbDelete(key: string): Promise<void> {
  return run<void>(VAULT_STORE, 'readwrite', (store) => store.delete(key));
}

export function idbGetItem<T>(
  store: StoreName,
  key: string,
): Promise<T | undefined> {
  return run<T | undefined>(store, 'readonly', (s) => s.get(key));
}

export function idbSetItem(
  store: StoreName,
  key: string,
  value: unknown,
): Promise<void> {
  return run<void>(store, 'readwrite', (s) => s.put(value, key));
}

export function idbRemoveItem(store: StoreName, key: string): Promise<void> {
  return run<void>(store, 'readwrite', (s) => s.delete(key));
}
