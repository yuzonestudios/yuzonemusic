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
    SEARCH: 10 * 60 * 1000,        // 10 minutes (increased from 5)
    LYRICS: 7 * 24 * 60 * 60 * 1000,  // 7 days (lyrics don't change)
    TOP_CHARTS: 60 * 60 * 1000,   // 60 minutes (increased from 30)
    PLAYLISTS: 5 * 60 * 1000,     // 5 minutes (increased from 2)
    PLAYLIST_SONGS: 3 * 60 * 1000, // 3 minutes for individual playlist songs
    STREAM_URL: 5 * 60 * 60 * 1000, // 5 hours (increased from 3, URLs expire after ~6 hours)
    ARTIST_DETAILS: 7 * 24 * 60 * 60 * 1000, // 7 days (artist info doesn't change often)
    ALBUM_DETAILS: 7 * 24 * 60 * 60 * 1000,  // 7 days (album info doesn't change)
    USER_PROFILE: 30 * 60 * 1000, // 30 minutes (user settings)
    LIKED_SONGS: 5 * 60 * 1000,    // 5 minutes (changes frequently but safe to cache)
    RECOMMENDATIONS: 60 * 60 * 1000, // 60 minutes (recommendations are expensive)
    HISTORY: 10 * 60 * 1000,       // 10 minutes
} as const;

// Periodic cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        cache.cleanup();
    }, 10 * 60 * 1000);
}
