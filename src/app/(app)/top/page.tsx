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
        fetchTopSongs();
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
                    <button className={styles.refreshBtn} onClick={fetchTopSongs}>
                        Try Again
                    </button>
                </div>
            </div>
        );

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
                    {songs.map((song) => (
                        <div key={song.videoId} className={styles.songCardWrapper}>
                            <SongCard song={song} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
