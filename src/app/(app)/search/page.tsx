"use client";

import { useState, useCallback, useEffect } from "react";
import Header from "@/components/layout/Header";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import type { Song, Artist, Album } from "@/types";
import styles from "./search.module.css";

type SearchType = "all" | "song" | "artist" | "album";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [searchType, setSearchType] = useState<SearchType>("all");
    const [songs, setSongs] = useState<Song[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const res = await fetch(
                `/api/search?q=${encodeURIComponent(query)}&type=${searchType}&limit=20`
            );
            const data = await res.json();

            if (data.success) {
                setSongs(data.data.songs || []);
                setArtists(data.data.artists || []);
                setAlbums(data.data.albums || []);
            } else {
                setError(data.error || "Search failed");
            }

            // Fetch liked songs for heart icons
            const likedRes = await fetch("/api/liked");
            if (likedRes.ok) {
                const likedData = await likedRes.json();
                if (likedData.success) {
                    const ids = new Set(likedData.data.map((s: Song) => s.videoId));
                    setLikedSongIds(ids as Set<string>);
                }
            }
        } catch (err) {
            setError("Failed to perform search. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [query, searchType]);

    // Debounced search effect
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleLike = async (song: Song) => {
        const isLiked = likedSongIds.has(song.videoId);

        try {
            if (isLiked) {
                await fetch(`/api/liked?videoId=${song.videoId}`, { method: "DELETE" });
                setLikedSongIds((prev) => {
                    const next = new Set(prev);
                    next.delete(song.videoId);
                    return next;
                });
            } else {
                await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(song),
                });
                setLikedSongIds((prev) => new Set(prev).add(song.videoId));
            }
        } catch (error) {
            console.error("Failed to update like:", error);
        }
    };

    return (
        <div className={styles.page}>
            <Header title="Search" />

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
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button onClick={handleSearch} className={styles.searchBtn}>
                        Search
                    </button>
                </div>

                {/* Search Type Tabs */}
                <div className={styles.tabs}>
                    {(["all", "song", "artist", "album"] as SearchType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setSearchType(type)}
                            className={`${styles.tab} ${searchType === type ? styles.active : ""}`}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                            {type === "all" ? "" : "s"}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className={styles.results}>
                    {loading ? (
                        <LoadingSpinner text="Searching..." />
                    ) : error ? (
                        <ErrorState message={error} onRetry={handleSearch} />
                    ) : !hasSearched ? (
                        <div className={styles.placeholder}>
                            <div className={styles.placeholderIcon}>🎵</div>
                            <h3>Search for music</h3>
                            <p>Find your favorite songs, artists, and albums</p>
                        </div>
                    ) : songs.length === 0 && artists.length === 0 && albums.length === 0 ? (
                        <div className={styles.noResults}>
                            <p>No results found for &quot;{query}&quot;</p>
                            <span>Try searching with different keywords</span>
                        </div>
                    ) : (
                        <>
                            {/* Songs */}
                            {songs.length > 0 && (searchType === "all" || searchType === "song") && (
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
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Artists */}
                            {artists.length > 0 && (searchType === "all" || searchType === "artist") && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>Artists</h3>
                                    <div className={styles.cardGrid}>
                                        {artists.map((artist) => (
                                            <div key={artist.id} className={styles.artistCard}>
                                                <img
                                                    src={artist.thumbnail}
                                                    alt={artist.name}
                                                    className={styles.artistImg}
                                                />
                                                <span className={styles.artistName}>{artist.name}</span>
                                                {artist.subscribers && (
                                                    <span className={styles.artistSubs}>
                                                        {artist.subscribers}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Albums */}
                            {albums.length > 0 && (searchType === "all" || searchType === "album") && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>Albums</h3>
                                    <div className={styles.cardGrid}>
                                        {albums.map((album) => (
                                            <div key={album.id} className={styles.albumCard}>
                                                <img
                                                    src={album.thumbnail}
                                                    alt={album.title}
                                                    className={styles.albumImg}
                                                />
                                                <span className={styles.albumTitle}>{album.title}</span>
                                                <span className={styles.albumArtist}>{album.artist}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
