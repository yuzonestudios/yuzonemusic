"use client";

import { useState, useCallback, useEffect } from "react";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import ArtistModal from "@/components/ui/ArtistModal";
import { Music, X, Clock, Trash2 } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import type { Song, Artist, Album } from "@/types";
import { getSearchHistory, addToSearchHistory, removeFromSearchHistory, clearSearchHistory } from "@/lib/search-history";
import styles from "./search.module.css";

type SearchType = "all" | "songs" | "artists" | "albums";

export default function SearchPage() {
    const { setLoading: setGlobalLoading } = usePlayerStore();
    const [query, setQuery] = useState("");
    const [searchType, setSearchType] = useState<SearchType>("all");
    const [songs, setSongs] = useState<Song[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [albumSongs, setAlbumSongs] = useState<Array<{ videoId: string; title: string; artists: Array<{ name: string }>; duration: string; thumbnail: string }>>([]);
    const [selectedAlbumTitle, setSelectedAlbumTitle] = useState<string | null>(null);
    const [selectedAlbumThumbnail, setSelectedAlbumThumbnail] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    const [pendingSearchRequest, setPendingSearchRequest] = useState<Promise<void> | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    // Cache search results in browser storage
    const getSearchCacheKey = (q: string, type: SearchType) => `search_${q}_${type}`;
    
    const getCachedSearchResults = (q: string, type: SearchType) => {
        try {
            const cached = localStorage.getItem(getSearchCacheKey(q, type));
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Cache valid for 5 minutes
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    return data;
                }
            }
        } catch (e) {
            console.error("Failed to read search cache:", e);
        }
        return null;
    };

    const setCachedSearchResults = (q: string, type: SearchType, data: any) => {
        try {
            localStorage.setItem(getSearchCacheKey(q, type), JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error("Failed to cache search results:", e);
        }
    };

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        // Save to search history
        addToSearchHistory(query);
        setSearchHistory(getSearchHistory().map(item => item.query));

        // Check if we already have a pending request for this query
        if (pendingSearchRequest) {
            return;
        }

        // Check browser cache first
        const cached = getCachedSearchResults(query, searchType);
        if (cached) {
            setSongs(cached.songs || []);
            setArtists(cached.artists || []);
            setAlbums(cached.albums || []);
            setError(null);
            setHasSearched(true);
            return;
        }

        setLoading(true);
        setGlobalLoading(true, "Searching...");
        setError(null);
        setHasSearched(true);

        const searchPromise = (async () => {
            try {
                const res = await fetch(
                    `/api/search?q=${encodeURIComponent(query)}&type=${searchType}&limit=20`
                );
                const data = await res.json();

                if (data.success) {
                    // Normalize songs to `Song` type (ensure single `artist` string)
                    const normalizedSongs: Song[] = (data.data.songs || []).map((s: any) => ({
                        videoId: s.videoId,
                        title: s.title,
                        artist: Array.isArray(s.artists) ? (s.artists[0] || s.artists.filter(Boolean).join(", ")) : (s.artist || "Unknown Artist"),
                        thumbnail: s.thumbnail,
                        duration: s.duration,
                        album: s.album,
                    }));

                    setSongs(normalizedSongs);
                    setArtists(data.data.artists || []);
                    setAlbums(data.data.albums || []);

                    // Cache the results
                    setCachedSearchResults(query, searchType, {
                        songs: normalizedSongs,
                        artists: data.data.artists || [],
                        albums: data.data.albums || []
                    });
                } else {
                    setError(data.error || "Search failed");
                }
            } catch (err) {
                setError("Failed to perform search. Please try again.");
            } finally {
                setLoading(false);
                setGlobalLoading(false);
                setPendingSearchRequest(null);
            }
        })();

        setPendingSearchRequest(searchPromise);
    }, [query, searchType, setGlobalLoading]);

    // Debounced search effect - 500ms delay for faster feedback
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else if (query === "") {
                setSongs([]);
                setArtists([]);
                setAlbums([]);
                setHasSearched(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, handleSearch]);

    // Fetch liked songs once and cache them
    useEffect(() => {
        // Load search history on mount
        setSearchHistory(getSearchHistory().map(item => item.query));

        const fetchLikedSongs = async () => {
            try {
                const cacheKey = 'liked_songs_cache';
                const cached = localStorage.getItem(cacheKey);
                
                // Use cached liked songs if available (5 min cache)
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < 5 * 60 * 1000) {
                        const ids = new Set(data.map((s: Song) => s.videoId));
                        setLikedSongIds(ids as Set<string>);
                        return;
                    }
                }

                const likedRes = await fetch("/api/liked");
                if (likedRes.ok) {
                    const likedData = await likedRes.json();
                    if (likedData.success) {
                        const ids = new Set(likedData.data.map((s: Song) => s.videoId));
                        setLikedSongIds(ids as Set<string>);
                        
                        // Cache liked songs
                        try {
                            localStorage.setItem(cacheKey, JSON.stringify({
                                data: likedData.data,
                                timestamp: Date.now()
                            }));
                        } catch (e) {
                            console.error("Failed to cache liked songs:", e);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch liked songs:", err);
            }
        };

        fetchLikedSongs();
    }, []);

    // Close artist modal when search results change
    useEffect(() => {
        setSelectedArtist(null);
    }, [query, searchType, songs]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleHistoryClick = (historyQuery: string) => {
        setQuery(historyQuery);
    };

    const handleRemoveHistory = (historyQuery: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeFromSearchHistory(historyQuery);
        setSearchHistory(getSearchHistory().map(item => item.query));
    };

    const handleClearHistory = () => {
        clearSearchHistory();
        setSearchHistory([]);
    };

    const handleLike = async (song: Song) => {
        const isLiked = likedSongIds.has(song.videoId);

        // Optimistically update UI
        if (isLiked) {
            setLikedSongIds((prev) => {
                const next = new Set(prev);
                next.delete(song.videoId);
                return next;
            });
        } else {
            setLikedSongIds((prev) => new Set(prev).add(song.videoId));
        }

        try {
            if (isLiked) {
                const res = await fetch(`/api/liked?videoId=${song.videoId}`, { method: "DELETE" });
                if (!res.ok) {
                    console.error("Failed to unlike song:", res.status);
                    // Revert on error
                    setLikedSongIds((prev) => new Set(prev).add(song.videoId));
                } else {
                    // Dispatch event for other components
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: song.videoId, liked: false }
                    }));
                }
            } else {
                const res = await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(song),
                });
                if (!res.ok) {
                    console.error("Failed to like song:", res.status);
                    // Revert on error
                    setLikedSongIds((prev) => {
                        const next = new Set(prev);
                        next.delete(song.videoId);
                        return next;
                    });
                } else {
                    // Dispatch event for other components
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: song.videoId, liked: true }
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to update like:", error);
            // Revert on error
            if (isLiked) {
                setLikedSongIds((prev) => new Set(prev).add(song.videoId));
            } else {
                setLikedSongIds((prev) => {
                    const next = new Set(prev);
                    next.delete(song.videoId);
                    return next;
                });
            }
        }
    };

    const handleAlbumClick = async (browseId: string, title: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/album?browseId=${encodeURIComponent(browseId)}`);
            if (!res.ok) throw new Error("Failed to fetch album");
            const data = await res.json();
            console.log("Album API Response:", data);
            console.log("Album Songs:", data.songs);
            setAlbumSongs(data.songs || []);
            // Prefer explicit album thumbnail fields; fall back to first song/array entries if needed
            const albumThumb = data.thumbnail || data.thumbnails?.[0]?.url || data.image || data.cover || null;
            setSelectedAlbumThumbnail(albumThumb);
            setSelectedAlbumTitle(title);
        } catch (e) {
            console.error("Error fetching album:", e);
            setError("Failed to load album songs");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.content}>
                {/* Search Input */}
                <div className={styles.searchBox}>
                    <div className={styles.inputWrapper}>
                        <svg
                            className={styles.searchIcon}
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search for songs, artists, or albums..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={styles.input}
                        />
                        {query && (
                            <button
                                onClick={() => setQuery("")}
                                className={styles.clearBtn}
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <button onClick={handleSearch} className={styles.searchBtn}>
                        Search
                    </button>
                </div>

                {/* Search Type Tabs */}
                <div className={styles.tabs}>
                    {(["all", "songs", "artists", "albums"] as SearchType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setSearchType(type)}
                            className={`${styles.tab} ${searchType === type ? styles.active : ""}`}
                        >
                            {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className={styles.results}>
                    {loading ? (
                        <LoadingSpinner text="Searching..." />
                    ) : error ? (
                        <ErrorState message={error} onRetry={handleSearch} />
                    ) : !hasSearched && selectedAlbumTitle === null && !query ? (
                        <div className={styles.placeholder}>
                            {searchHistory.length > 0 ? (
                                <>
                                    <div className={styles.historySection}>
                                        <div className={styles.historyHeader}>
                                            <h3 className={styles.historyTitle}>
                                                <Clock size={18} /> Recent Searches
                                            </h3>
                                            <button 
                                                onClick={handleClearHistory}
                                                className={styles.clearHistoryBtn}
                                                title="Clear search history"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className={styles.historyList}>
                                            {searchHistory.slice(0, 10).map((item) => (
                                                <div 
                                                    key={item}
                                                    className={styles.historyItem}
                                                    onClick={() => handleHistoryClick(item)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            handleHistoryClick(item);
                                                        }
                                                    }}
                                                >
                                                    <Clock size={16} className={styles.historyItemIcon} />
                                                    <span className={styles.historyItemText}>{item}</span>
                                                    <button
                                                        className={styles.removeHistoryBtn}
                                                        onClick={(e) => handleRemoveHistory(item, e)}
                                                        title="Remove from history"
                                                        aria-label={`Remove "${item}" from history`}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.placeholderIcon}><Music size={48} /></div>
                                    <h3>Search for music</h3>
                                    <p>Find your favorite songs, artists, and albums</p>
                                </>
                            )}
                        </div>
                    ) : !hasSearched && selectedAlbumTitle === null ? (
                        <div className={styles.placeholder}>
                            <div className={styles.placeholderIcon}><Music size={48} /></div>
                            <h3>Search for music</h3>
                            <p>Find your favorite songs, artists, and albums</p>
                        </div>
                    ) : selectedAlbumTitle && albumSongs.length > 0 ? (
                        <div>
                            <button onClick={() => setSelectedAlbumTitle(null)} className={styles.backBtn}>← Back to results</button>
                            <h2 className={styles.sectionTitle}>{selectedAlbumTitle}</h2>
                            <div className={styles.songList}>
                                {albumSongs.map((song, index) => {
                                    const normalizedSong: Song = {
                                        videoId: song.videoId,
                                        title: song.title,
                                        artist: song.artists?.map(a => a.name).join(", ") || "Unknown Artist",
                                        // Force album artwork for album songs view
                                        thumbnail: selectedAlbumThumbnail || song.thumbnail,
                                        duration: song.duration,
                                    };
                                    return (
                                        <SongCard
                                            key={song.videoId}
                                            song={normalizedSong}
                                            songs={albumSongs.map(s => ({ videoId: s.videoId, title: s.title, artist: s.artists?.map(a => a.name).join(", ") || "Unknown", thumbnail: selectedAlbumThumbnail || s.thumbnail, duration: s.duration }))}
                                            index={index}
                                            onLike={handleLike}
                                            isLiked={likedSongIds.has(song.videoId)}
                                            onPlay={() => setSelectedArtist(null)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ) : songs.length === 0 && artists.length === 0 && albums.length === 0 ? (
                        <div className={styles.noResults}>
                            <p>No results found for &quot;{query}&quot;</p>
                            <span>Try searching with different keywords</span>
                        </div>
                    ) : (
                        <>
                            {/* Songs */}
                            {songs.length > 0 && (searchType === "all" || searchType === "songs") && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>Songs</h3>
                                    <div className={styles.songList}>
                                        {songs.map((song, index) => (
                                            <SongCard
                                                key={song.videoId}
                                                song={song}
                                                songs={songs}
                                                index={index}
                                                onLike={handleLike}
                                                isLiked={likedSongIds.has(song.videoId)}
                                                onPlay={() => setSelectedArtist(null)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Artists */}
                            {artists.length > 0 && (searchType === "all" || searchType === "artists") && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>Artists</h3>
                                    <div className={styles.cardGrid}>
                                        {artists.map((artist) => (
                                            <div 
                                                key={artist.browseId} 
                                                className={styles.artistCard}
                                                onClick={() => setSelectedArtist(artist.name)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        setSelectedArtist(artist.name);
                                                    }
                                                }}
                                            >
                                                <img
                                                    src={artist.thumbnail}
                                                    alt={artist.name}
                                                    className={styles.artistImg}
                                                />
                                                <span className={styles.artistName}>{artist.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Albums */}
                            {albums.length > 0 && (searchType === "all" || searchType === "albums") && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>Albums</h3>
                                    <div className={styles.cardGrid}>
                                        {albums.map((album) => (
                                            <div
                                                key={album.browseId}
                                                className={styles.albumCard}
                                                onClick={() => handleAlbumClick(album.browseId, album.title)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        handleAlbumClick(album.browseId, album.title);
                                                    }
                                                }}
                                            >
                                                <img
                                                    src={album.thumbnail}
                                                    alt={album.title}
                                                    className={styles.albumImg}
                                                />
                                                <span className={styles.albumTitle}>{album.title}</span>
                                                <span className={styles.albumArtist}>
                                                    {Array.isArray(album.artists) ? album.artists.join(", ") : "Unknown"}
                                                </span>
                                                {album.year && (
                                                    <span className={styles.albumYear}>{album.year}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>

            <ArtistModal
                isOpen={!!selectedArtist}
                artistName={selectedArtist || ""}
                onClose={() => setSelectedArtist(null)}
            />
        </div>
    );
}
