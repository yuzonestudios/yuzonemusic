/**
 * Custom hook for fetching data with automatic client-side caching
 */

import { useState, useCallback, useEffect } from "react";
import { browserCache, BROWSER_CACHE_TTL } from "@/lib/browser-cache";

interface UseFetchOptions {
    ttl?: number;
    skip?: boolean;
    immediate?: boolean;
}

export function useDataFetch<T>(
    url: string,
    options: UseFetchOptions = {}
) {
    const { ttl = BROWSER_CACHE_TTL.LIKED_SONGS, skip = false, immediate = true } = options;
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        // Check browser cache first
        const cacheKey = `fetch:${url}`;
        const cached = browserCache.get<T>(cacheKey);
        if (cached) {
            setData(cached);
            setLoading(false);
            return cached;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setData(result);

            // Cache the result
            browserCache.set(cacheKey, result, ttl);

            return result;
        } catch (err: any) {
            const errorMessage = err.message || "Failed to fetch data";
            setError(errorMessage);
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [url, ttl]);

    useEffect(() => {
        if (!skip && immediate) {
            fetchData();
        }
    }, [url, skip, immediate, fetchData]);

    return { data, loading, error, refetch: fetchData };
}
