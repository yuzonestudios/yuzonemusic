"use client";

import { useEffect, useState } from "react";
import { Zap, Music } from "lucide-react";
import { YTMusicSong } from "@/lib/youtube-music";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import styles from "./top.module.css";

export default function TopSongsPage() {
    const [songs, setSongs] = useState<YTMusicSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

    const fetchTopSongs = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/top");
            const data = await res.json();

            if (data.success && data.songs) {
                setSongs(data.songs.slice(0, 20));
            } else {
                setError("Failed to load top songs");
            }
        } catch (err) {
            console.error("Error fetching top songs:", err);
            setError("Error fetching top songs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            await fetchTopSongs();
            
            // Fetch liked songs
            try {
                const likedRes = await fetch("/api/liked");
                if (likedRes.ok) {
                    const likedData = await likedRes.json();
                    if (likedData.success) {
                        const ids = new Set(likedData.data.map((s: any) => s.videoId));
                        setLikedSongIds(ids as Set<string>);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch liked songs:", error);
            }
        };

        fetchInitialData();
    }, []);

    // Listen for like events
    useEffect(() => {
        const handleLikeEvent = (event: any) => {
            const { videoId, liked } = event.detail;
            setLikedSongIds((prev) => {
                const next = new Set(prev);
                if (liked) {
                    next.add(videoId);
                } else {
                    next.delete(videoId);
                }
                return next;
            });
        };

        window.addEventListener('songLiked', handleLikeEvent);
        return () => window.removeEventListener('songLiked', handleLikeEvent);
    }, []);

    if (loading)
        return (
            <div className={styles.loading}>
                <LoadingSpinner size="large" />
                <p className={styles.loadingText}>Fetching top tracks...</p>
            </div>
        );

    if (error)
        return (
            <div className={styles.error}>
                <div>
                    <p className={styles.errorText}>{error}</p>
                    <button className={styles.refreshBtn} onClick={() => {
                        setError("");
                        fetchTopSongs();
                    }}>
                        Try Again
                    </button>
                </div>
            </div>
        );

    const handleLike = async (song: YTMusicSong) => {
        const isLiked = likedSongIds.has(song.videoId);

        try {
            if (isLiked) {
                const res = await fetch(`/api/liked?videoId=${song.videoId}`, {
                    method: "DELETE",
                });

                if (res.ok) {
                    setLikedSongIds((prev) => {
                        const next = new Set(prev);
                        next.delete(song.videoId);
                        return next;
                    });

                    window.dispatchEvent(
                        new CustomEvent("songLiked", {
                            detail: { videoId: song.videoId, liked: false },
                        })
                    );
                }
            } else {
                const res = await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        videoId: song.videoId,
                        title: song.title,
                        artist: song.artist,
                        thumbnail: song.thumbnail,
                        duration: song.duration || "0:00",
                    }),
                });

                if (res.ok) {
                    setLikedSongIds((prev) => new Set(prev).add(song.videoId));

                    window.dispatchEvent(
                        new CustomEvent("songLiked", {
                            detail: { videoId: song.videoId, liked: true },
                        })
                    );
                }
            }
        } catch (error) {
            console.error("Failed to update like:", error);
        }
    };

    return (
        <div className={styles.topSongs}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerIcon}>
                        <Zap size={48} />
                    </div>
                    <div className={styles.headerInfo}>
                        <span className={styles.badge}>TRENDING NOW</span>
                        <h1 className={styles.title}>Top 20 Songs</h1>
                        <p className={styles.subtitle}>
                            Most popular tracks on Yuzone Music right now
                        </p>
                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <Music size={16} />
                                <span>
                                    <span className={styles.statValue}>{songs.length}</span> tracks
                                </span>
                            </div>
                            <div className={styles.stat}>
                                <span>Updated daily</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.grid}>
                    {songs.map((song, index) => (
                        <div key={`${song.videoId}-${index}`} className={styles.songCardWrapper}>
                            <SongCard 
                                song={song}
                                songs={songs}
                                index={index}
                                onLike={handleLike}
                                isLiked={likedSongIds.has(song.videoId)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
