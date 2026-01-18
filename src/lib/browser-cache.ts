/**
 * Browser-side caching utility using localStorage
 * Provides TTL-based caching for client-side API responses
 */

interface CacheEntry {
    data: any;
    timestamp: number;
    ttl: number;
}

class BrowserCache {
    private prefix = "yz_cache_";

    /**
     * Get cached data if it exists and hasn't expired
     */
    get<T>(key: string): T | null {
        if (typeof window === "undefined") {
            return null;
        }

        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) {
                return null;
            }

            const entry: CacheEntry = JSON.parse(item);
            const now = Date.now();
            const age = now - entry.timestamp;

            if (age > entry.ttl) {
                // Cache expired, remove it
                localStorage.removeItem(this.prefix + key);
                return null;
            }

            return entry.data as T;
        } catch (error) {
            console.error("Error reading from browser cache:", error);
            return null;
        }
    }

    /**
     * Set cache data with TTL in milliseconds
     */
    set<T>(key: string, data: T, ttl: number): void {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const entry: CacheEntry = {
                data,
                timestamp: Date.now(),
                ttl,
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(entry));
        } catch (error) {
            console.error("Error writing to browser cache:", error);
        }
    }

    /**
     * Delete specific cache entry
     */
    delete(key: string): void {
        if (typeof window === "undefined") {
            return;
        }

        try {
            localStorage.removeItem(this.prefix + key);
        } catch (error) {
            console.error("Error deleting from browser cache:", error);
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key);
                }
            }
            keys.forEach((key) => localStorage.removeItem(key));
        } catch (error) {
            console.error("Error clearing browser cache:", error);
        }
    }
}

// Singleton instance
export const browserCache = new BrowserCache();

// Browser cache TTL constants (in milliseconds)
export const BROWSER_CACHE_TTL = {
    LIKED_SONGS: 5 * 60 * 1000,     // 5 minutes
    USER_PROFILE: 30 * 60 * 1000,   // 30 minutes
    PLAYLISTS: 5 * 60 * 1000,       // 5 minutes
    RECOMMENDATIONS: 60 * 60 * 1000, // 60 minutes
    TOP_CHARTS: 30 * 60 * 1000,     // 30 minutes
    SEARCH: 10 * 60 * 1000,         // 10 minutes
} as const;
