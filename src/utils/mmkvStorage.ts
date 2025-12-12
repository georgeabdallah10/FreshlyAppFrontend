/**
 * ============================================
 * MMKV STORAGE UTILITY
 * ============================================
 *
 * High-performance key-value storage using MMKV
 * - 30x faster than AsyncStorage
 * - Synchronous API
 * - Encrypted storage
 * - Perfect for caching and persistence
 * - Falls back to AsyncStorage in Expo Go
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ============================================
// TYPES
// ============================================

export interface MMKV {
  set(key: string, value: string | number | boolean): void;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  contains(key: string): boolean;
  remove(key: string): void;
  clearAll(): void;
  getAllKeys(): string[];
}

// ============================================
// EXPO GO DETECTION
// ============================================

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ============================================
// MOCK MMKV FOR EXPO GO
// ============================================

/**
 * Creates a mock MMKV instance using AsyncStorage for Expo Go compatibility
 */
function createMockMMKV(id: string): MMKV {
  const prefix = `${id}:`;

  return {
    set(key: string, value: string | number | boolean): void {
      AsyncStorage.setItem(prefix + key, String(value)).catch(console.log);
    },

    getString(key: string): string | undefined {
      // Synchronous fallback - returns undefined, data loaded async
      let result: string | undefined;
      AsyncStorage.getItem(prefix + key)
        .then(value => { if (value) result = value; })
        .catch(console.log);
      return result;
    },

    getNumber(key: string): number | undefined {
      const str = this.getString(key);
      return str ? Number(str) : undefined;
    },

    getBoolean(key: string): boolean | undefined {
      const str = this.getString(key);
      return str === 'true' ? true : str === 'false' ? false : undefined;
    },

    contains(key: string): boolean {
      let result = false;
      AsyncStorage.getItem(prefix + key)
        .then(value => { result = value !== null; })
        .catch(console.log);
      return result;
    },

    remove(key: string): void {
      AsyncStorage.removeItem(prefix + key).catch(console.log);
    },

    clearAll(): void {
      AsyncStorage.getAllKeys()
        .then(keys => {
          const prefixedKeys = keys.filter(k => k.startsWith(prefix));
          return AsyncStorage.multiRemove(prefixedKeys);
        })
        .catch(console.log);
    },

    getAllKeys(): string[] {
      let result: string[] = [];
      AsyncStorage.getAllKeys()
        .then(keys => {
          result = keys.filter(k => k.startsWith(prefix)).map(k => k.replace(prefix, ''));
        })
        .catch(console.log);
      return result;
    },
  };
}

// ============================================
// MMKV INSTANCES
// ============================================

let storage: MMKV;
let cacheStorage: MMKV;
let userStorage: MMKV;

if (IS_EXPO_GO) {
  // Use AsyncStorage fallback in Expo Go
  console.warn('[MMKV] Running in Expo Go - using AsyncStorage fallback. For best performance, use a development build.');
  storage = createMockMMKV('app-storage');
  cacheStorage = createMockMMKV('query-cache');
  userStorage = createMockMMKV('user-storage');
} else {
  // Use real MMKV in development builds
  try {
    const { createMMKV } = require('react-native-mmkv');

    storage = createMMKV({
      id: 'app-storage',
      encryptionKey: 'freshly-app-encryption-key-2024',
    });

    cacheStorage = createMMKV({
      id: 'query-cache',
      encryptionKey: 'freshly-cache-encryption-key-2024',
    });

    userStorage = createMMKV({
      id: 'user-storage',
      encryptionKey: 'freshly-user-encryption-key-2024',
    });
  } catch (error) {
    console.log('[MMKV] Failed to initialize MMKV, falling back to AsyncStorage:', error);
    storage = createMockMMKV('app-storage');
    cacheStorage = createMockMMKV('query-cache');
    userStorage = createMockMMKV('user-storage');
  }
}

export { cacheStorage, storage, userStorage };

// ============================================
// TYPED STORAGE HELPERS
// ============================================

/**
 * Generic MMKV storage wrapper with type safety
 */
export class MMKVStorage<T = any> {
  constructor(private mmkv: MMKV) {}

  /**
   * Set a value in storage
   */
  set(key: string, value: T): void {
    this.mmkv.set(key, JSON.stringify(value));
  }

  /**
   * Get a value from storage
   */
  get(key: string): T | null {
    const value = this.mmkv.getString(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.log(`[MMKVStorage] Failed to parse ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from storage
   */
  delete(key: string): void {
    this.mmkv.remove(key);
  }

  /**
   * Check if a key exists
   */
  contains(key: string): boolean {
    return this.mmkv.contains(key);
  }

  /**
   * Get all keys
   */
  getAllKeys(): string[] {
    return this.mmkv.getAllKeys();
  }

  /**
   * Get string value
   */
  getString(key: string): string | undefined {
    return this.mmkv.getString(key);
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.mmkv.clearAll();
  }

  /**
   * Get storage size in bytes (estimated)
   */
  getSize(): number {
    // MMKV doesn't provide size directly, estimate from keys
    const keys = this.mmkv.getAllKeys();
    let totalSize = 0;

    keys.forEach((key: string) => {
      const value = this.mmkv.getString(key);
      if (value) {
        // Approximate size in bytes (UTF-16 encoding)
        totalSize += value.length * 2;
      }
    });

    return totalSize;
  }
}

// ============================================
// EXPORT TYPED INSTANCES
// ============================================

export const appStorage = new MMKVStorage(storage);
export const queryCacheStorage = new MMKVStorage(cacheStorage);
export const userDataStorage = new MMKVStorage(userStorage);

// ============================================
// REACT QUERY PERSISTER ADAPTER
// ============================================

/**
 * Adapter for React Query persistence
 * Implements the required interface for @tanstack/react-query-persist-client
 */
export const mmkvQueryPersister = {
  /**
   * Persist query cache to MMKV
   */
  persistClient(persistedClient: any): void {
    cacheStorage.set('REACT_QUERY_OFFLINE_CACHE', JSON.stringify(persistedClient));
  },

  /**
   * Restore query cache from MMKV
   */
  restoreClient(): any {
    const cached = cacheStorage.getString('REACT_QUERY_OFFLINE_CACHE');
    if (!cached) return undefined;

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.log('[MMKV Persister] Failed to restore cache:', error);
      return undefined;
    }
  },

  /**
   * Remove persisted cache
   */
  removeClient(): void {
    cacheStorage.remove('REACT_QUERY_OFFLINE_CACHE');
  },
};

export default storage;
