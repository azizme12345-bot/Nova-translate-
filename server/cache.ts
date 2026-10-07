/**
 * High-Speed Server-Side Memory Cache
 * Provides sub-millisecond responses for frequent translations and transcriptions.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ServerCache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(maxItems = 1000, defaultTtlMs = 1000 * 60 * 60 * 24) {
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.store.size >= this.maxItems) {
      // Remove oldest
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const serverTranslationCache = new ServerCache(2000, 1000 * 60 * 60 * 48); // 48-hour cache
