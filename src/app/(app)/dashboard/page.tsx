"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Search, Heart } from "lucide-react";
import type { Song } from "@/types";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
    const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
    // ... (keep state)
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // ... (keep structure)
        fetchData();
    }, []);

    const handleLike = async (song: Song) => {
        // ... (keep structure)
    };

    return (
        <div className={styles.page}>
            <Header title="Home" />

            <div className={styles.content}>
                {/* Welcome Section */}
                <section className={styles.welcome}>
                    <h2 className={styles.welcomeTitle}>Good {getTimeGreeting()}</h2>
                    <p className={styles.welcomeText}>Ready to discover some great music?</p>
                </section>

                {/* Quick Actions */}
                <section className={styles.quickActions}>
                    <a href="/search" className={styles.actionCard}>
                        <div className={styles.actionIcon}><Search size={24} /></div>
                        <span>Search Songs</span>
                    </a>
                    <a href="/library" className={styles.actionCard}>
                        <div className={styles.actionIcon}><Heart size={24} fill="currentColor" /></div>
                        <span>Liked Songs</span>
                    </a>
                </section>

                {/* Recently Played */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Recently Played</h3>

                    {loading ? (
                        <LoadingSpinner text="Loading history..." />
                    ) : recentlyPlayed.length > 0 ? (
                        <div className={styles.songList}>
                            {recentlyPlayed.map((song, index) => (
                                <SongCard
                                    key={`${song.videoId}-${index}`}
                                    song={song}
                                    songs={recentlyPlayed}
                                    index={index}
                                    onLike={handleLike}
                                    isLiked={likedSongIds.has(song.videoId)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.empty}>
                            <p>No recently played songs yet.</p>
                            <a href="/search" className={styles.emptyLink}>
                                Start searching for music
                            </a>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
}
