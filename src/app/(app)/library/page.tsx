"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Song } from "@/types";
import styles from "./library.module.css";

type Tab = "liked" | "recent";

export default function LibraryPage() {
    const [activeTab, setActiveTab] = useState<Tab>("liked");
    const [likedSongs, setLikedSongs] = useState<Song[]>([]);
    const [recentSongs, setRecentSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch liked songs
                const likedRes = await fetch("/api/liked");
                if (likedRes.ok) {
                    const likedData = await likedRes.json();
                    if (likedData.success) {
                        setLikedSongs(likedData.data || []);
                        const ids = new Set(likedData.data.map((s: Song) => s.videoId));
                        setLikedSongIds(ids as Set<string>);
                    }
                }

                // Fetch recently played
                const historyRes = await fetch("/api/history?limit=50");
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
            }
        };

        fetchData();
    }, []);

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
                setLikedSongs((prev) => prev.filter((s) => s.videoId !== song.videoId));
            } else {
                await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(song),
                });
                setLikedSongIds((prev) => new Set(prev).add(song.videoId));
                setLikedSongs((prev) => [song, ...prev]);
            }
        } catch (error) {
            console.error("Failed to update like:", error);
        }
    };

    const currentSongs = activeTab === "liked" ? likedSongs : recentSongs;

    return (
        <div className={styles.page}>
            <Header title="Library" />

            <div className={styles.content}>
                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        onClick={() => setActiveTab("liked")}
                        className={`${styles.tab} ${activeTab === "liked" ? styles.active : ""}`}
                    >
                        <Heart size={18} fill={activeTab === "liked" ? "currentColor" : "none"} />
                        Liked Songs
                        <span className={styles.count}>{likedSongs.length}</span>
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
