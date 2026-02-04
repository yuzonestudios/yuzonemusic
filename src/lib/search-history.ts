/**
 * Search History Management
 * Handles saving, retrieving, and managing local search history
 */

export interface SearchHistoryItem {
    query: string;
    timestamp: number;
}

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Get all search history items, ordered by most recent first
 */
export function getSearchHistory(): SearchHistoryItem[] {
    try {
        const cached = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (cached) {
            const history = JSON.parse(cached) as SearchHistoryItem[];
            return history.sort((a, b) => b.timestamp - a.timestamp);
        }
    } catch (e) {
        console.error("Failed to read search history:", e);
    }
    return [];
}

/**
 * Add a search query to history
 * Prevents duplicate consecutive searches
 */
export function addToSearchHistory(query: string): void {
    if (!query.trim()) return;

    try {
        const history = getSearchHistory();
        
        // Don't add if it's the same as the most recent search
        if (history.length > 0 && history[0].query === query.trim()) {
            return;
        }

        // Remove duplicate if exists
        const filteredHistory = history.filter(item => item.query !== query.trim());

        // Add new search at the beginning
        const newHistory = [
            { query: query.trim(), timestamp: Date.now() },
            ...filteredHistory
        ].slice(0, MAX_HISTORY_ITEMS);

        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
        console.error("Failed to save search history:", e);
    }
}

/**
 * Remove a specific search from history
 */
export function removeFromSearchHistory(query: string): void {
    try {
        const history = getSearchHistory();
        const filteredHistory = history.filter(item => item.query !== query);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (e) {
        console.error("Failed to remove from search history:", e);
    }
}

/**
 * Clear all search history
 */
export function clearSearchHistory(): void {
    try {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {
        console.error("Failed to clear search history:", e);
    }
}

/**
 * Get recent search queries (last N items)
 */
export function getRecentSearches(limit: number = 10): string[] {
    return getSearchHistory()
        .slice(0, limit)
        .map(item => item.query);
}
