/**
 * Client-Side Instant Translation Cache
 * Stores frequently used and recent translations in memory + localStorage.
 * Enables instant 0ms retrieval for repeated phrases and reduces backend load.
 */

import { TranslationResult } from './apiClient.ts';

const CACHE_STORAGE_KEY = 'nova_translation_cache_v2';
const MAX_CACHE_ENTRIES = 250;

class TranslationCacheService {
  private memoryCache: Map<string, { data: TranslationResult; expiresAt: number }> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private generateKey(text: string, sourceLang: string, targetLang: string): string {
    return `${sourceLang.trim().toLowerCase()}_to_${targetLang.trim().toLowerCase()}_${text.trim().toLowerCase()}`;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        for (const [key, item] of Object.entries(parsed) as [string, any][]) {
          if (item?.expiresAt > now && item?.data) {
            this.memoryCache.set(key, item);
          }
        }
      }
    } catch {
      // Storage error ignored
    }
  }

  private saveToStorage() {
    try {
      const plainObj: Record<string, any> = {};
      let count = 0;
      for (const [key, val] of this.memoryCache.entries()) {
        if (count++ > MAX_CACHE_ENTRIES) break;
        plainObj[key] = val;
      }
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(plainObj));
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  get(text: string, sourceLang: string, targetLang: string): TranslationResult | null {
    const key = this.generateKey(text, sourceLang, targetLang);
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data;
  }

  set(text: string, sourceLang: string, targetLang: string, data: TranslationResult, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    const key = this.generateKey(text, sourceLang, targetLang);
    
    // Evict oldest if exceeding limit
    if (this.memoryCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });

    this.saveToStorage();
  }

  clear() {
    this.memoryCache.clear();
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch {}
  }
}

export const TranslationCache = new TranslationCacheService();
