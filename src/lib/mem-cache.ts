/**
 * Process-level in-memory TTL cache.
 *
 * L1 for all hot data (entries, auth uid).  Zero network, <1 ms per hit.
 * Redis is used as L2 only on a cache miss (cold Lambda start).
 *
 * Works perfectly for a single-user app because all requests within a session
 * are served by the same warm Lambda instance.
 */

interface Entry<T> {
  value: T;
  expiresAt: number; // Date.now() ms
}

declare global {
  // eslint-disable-next-line no-var
  var _memCache: Map<string, Entry<unknown>> | undefined;
}

function getStore(): Map<string, Entry<unknown>> {
  if (!global._memCache) global._memCache = new Map();
  return global._memCache;
}

export function memGet<T>(key: string): T | null {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function memSet<T>(key: string, value: T, ttlMs: number): void {
  getStore().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function memDel(key: string): void {
  getStore().delete(key);
}

/** Delete all cache entries whose key starts with the given prefix. */
export function memDelPrefix(prefix: string): void {
  const store = getStore();
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

