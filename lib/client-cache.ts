/**
 * In-memory client-side cache for instant (0ms) page transitions.
 * Implements the Stale-While-Revalidate (SWR) design pattern.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEntry<any>>();

export function getClientCache<T = any>(key: string, maxAgeMs = 120_000): T | null {
  if (typeof window === "undefined") return null;
  const entry = memoryCache.get(key);
  if (!entry) return null;
  // If entry exists and is within maxAge (default 2 mins), return cached data
  if (Date.now() - entry.timestamp > maxAgeMs) {
    return null;
  }
  return entry.data as T;
}

export function setClientCache<T = any>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateClientCache(prefix?: string): void {
  if (typeof window === "undefined") return;
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

