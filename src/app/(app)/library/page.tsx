"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Heart, Clock, Music } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import type { Song } from "@/types";
import styles from "./library.module.css";

type Tab = "liked" | "recent";

export default function LibraryPage() {
    const { setLoading: setGlobalLoading } = usePlayerStore();
    const [activeTab, setActiveTab] = useState<Tab>("liked");
    const [likedSongs, setLikedSongs] = useState<Song[]>([]);
    const [recentSongs, setRecentSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

    const [totalLiked, setTotalLiked] = useState(0);

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            setGlobalLoading(true, "Loading library...");
            try {
                // Fetch both concurrently
                const [likedRes, historyRes] = await Promise.all([
                    fetch("/api/liked?limit=50&page=1", { cache: "no-store" }),
                    fetch("/api/history?limit=50", { cache: "no-store" })
                ]);

                if (likedRes.ok) {
                    const likedData = await likedRes.json();
                    if (likedData.success) {
                        setLikedSongs(likedData.data || []);
                        setLikedSongIds(new Set(likedData.data.map((s: Song) => s.videoId)));
                        // Set total count
                        if (likedData.pagination) {
                            setTotalLiked(likedData.pagination.total);
                            setHasMore(likedData.pagination.page < likedData.pagination.pages);
                        } else {
                            setTotalLiked(likedData.data.length);
                            setHasMore(false);
                        }
                    }
                }

                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    if (historyData.success) {
                        setRecentSongs(historyData.data || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch library data:", error);
            } finally {
                setLoading(false);
                setGlobalLoading(false);
            }
        };

        fetchInitialData();
    }, [setGlobalLoading]);

    // Listen for like events from other components (player, search)
    useEffect(() => {
        const handleLikeEvent = (event: any) => {
            const { videoId, liked } = event.detail;
            
            if (liked) {
                setLikedSongIds((prev) => new Set(prev).add(videoId));
            } else {
                setLikedSongIds((prev) => {
                    const next = new Set(prev);
                    next.delete(videoId);
                    return next;
                });
                // Remove from liked songs list if on liked tab
                setLikedSongs((prev) => prev.filter((s) => s.videoId !== videoId));
                setTotalLiked(prev => Math.max(0, prev - 1));
            }
        };

        window.addEventListener('songLiked', handleLikeEvent);
        return () => window.removeEventListener('songLiked', handleLikeEvent);
    }, []);

    const loadMoreLiked = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        setGlobalLoading(true, "Loading more songs...");
        try {
            const nextPage = page + 1;
            const res = await fetch(`/api/liked?limit=50&page=${nextPage}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setLikedSongs(prev => [...prev, ...data.data]);
                    setLikedSongIds(prev => {
                        const next = new Set(prev);
                        data.data.forEach((s: Song) => next.add(s.videoId));
                        return next;
                    });
                    setPage(nextPage);
                    if (data.pagination) {
                        setHasMore(data.pagination.page < data.pagination.pages);
                        // Ensure total is synced if changed
                        setTotalLiked(data.pagination.total);
                    } else {
                        setHasMore(false);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load more liked songs:", error);
        } finally {
            setLoadingMore(false);
            setGlobalLoading(false);
        }
    };

    const handleLike = async (song: Song) => {
        const isLiked = likedSongIds.has(song.videoId);

        try {
            if (isLiked) {
                setGlobalLoading(true, "Removing from liked...");
                const res = await fetch(`/api/liked?videoId=${song.videoId}`, { method: "DELETE" });
                
                if (res.ok) {
                    setLikedSongIds((prev) => {
                        const next = new Set(prev);
                        next.delete(song.videoId);
                        return next;
                    });
                    setLikedSongs((prev) => prev.filter((s) => s.videoId !== song.videoId));
                    setTotalLiked(prev => Math.max(0, prev - 1));
                    
                    // Dispatch event for other components
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: song.videoId, liked: false }
                    }));
                }
            } else {
                setGlobalLoading(true, "Adding to liked...");
                const res = await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(song),
                });
                
                if (res.ok) {
                    setLikedSongIds((prev) => new Set(prev).add(song.videoId));
                    setLikedSongs((prev) => [song, ...prev]);
                    setTotalLiked(prev => prev + 1);
                    
                    // Dispatch event for other components
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: song.videoId, liked: true }
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to update like:", error);
        } finally {
            setGlobalLoading(false);
        }
    };

    const currentSongs = activeTab === "liked" ? likedSongs : recentSongs;

    return (
        <div className={styles.page}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerIcon}>
                            <Heart size={48} fill="currentColor" />
                        </div>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.headerTitle}>My Library</h1>
                            <p className={styles.headerSubtitle}>
                                Your favorite songs and listening history
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        onClick={() => setActiveTab("liked")}
                        className={`${styles.tab} ${activeTab === "liked" ? styles.active : ""}`}
                    >
                        <Heart size={18} fill={activeTab === "liked" ? "currentColor" : "none"} />
                        Liked Songs
                        <span className={styles.count}>{totalLiked}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("recent")}
                        className={`${styles.tab} ${activeTab === "recent" ? styles.active : ""}`}
                    >
                        <Clock size={18} />
                        Recently Played
                        <span className={styles.count}>{recentSongs.length}</span>
                    </button>
                </div>

                {/* Content */}
                <div className={styles.libraryContent}>
                    {loading ? (
                        <LoadingSpinner text="Loading library..." />
                    ) : currentSongs.length > 0 ? (
                        <>
                            <div className={styles.songList}>
                                {currentSongs.map((song, index) => (
                                    <SongCard
                                        key={`${song.videoId}-${index}`}
                                        song={song}
                                        songs={currentSongs}
                                        index={index}
                                        onLike={handleLike}
                                        isLiked={likedSongIds.has(song.videoId)}
                                    />
                                ))}
                            </div>

                            {activeTab === "liked" && hasMore && (
                                <div className="flex justify-center mt-6 mb-4">
                                    <button
                                        onClick={loadMoreLiked}
                                        disabled={loadingMore}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loadingMore ? "Loading..." : "Load More"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.empty}>
                            {activeTab === "liked" ? (
                                <>
                                    <div className={styles.emptyIcon}><Heart size={48} fill="currentColor" /></div>
                                    <h3>No liked songs yet</h3>
                                    <p>Songs you like will appear here</p>
                                    <a href="/search" className={styles.emptyLink}>
                                        Find songs to like
                                    </a>
                                </>
                            ) : (
                                <>
                                    <div className={styles.emptyIcon}><Music size={48} /></div>
                                    <h3>No recent songs</h3>
                                    <p>Songs you play will appear here</p>
                                    <a href="/search" className={styles.emptyLink}>
                                        Start listening
                                    </a>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
