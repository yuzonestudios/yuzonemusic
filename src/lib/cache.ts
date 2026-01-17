/**
 * Simple in-memory cache with TTL support
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class MemoryCache {
    private cache: Map<string, CacheEntry<any>>;

    constructor() {
        this.cache = new Map();
    }

    /**
     * Get cached data if it exists and hasn't expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > entry.ttl) {
            // Cache expired, remove it
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cache data with TTL in milliseconds
     */
    set<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    /**
     * Delete specific cache entry
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Clean up expired entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
    SEARCH: 5 * 60 * 1000,        // 5 minutes
    LYRICS: 24 * 60 * 60 * 1000,  // 24 hours (lyrics don't change)
    TOP_CHARTS: 30 * 60 * 1000,   // 30 minutes
    PLAYLISTS: 2 * 60 * 1000,     // 2 minutes
    STREAM_URL: 3 * 60 * 60 * 1000, // 3 hours (URLs expire after ~6 hours)
    ARTIST_DETAILS: 24 * 60 * 60 * 1000, // 24 hours (artist info doesn't change often)
    ALBUM_DETAILS: 24 * 60 * 60 * 1000,  // 24 hours (album info doesn't change)
} as const;

// Periodic cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        cache.cleanup();
    }, 10 * 60 * 1000);
}
