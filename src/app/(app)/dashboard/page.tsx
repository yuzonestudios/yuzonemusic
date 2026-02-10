"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Search, Heart, Music, Sparkles, Clock } from "lucide-react";
import type { Song } from "@/types";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
    const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
    const [recommendations, setRecommendations] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
    const [monthlyMinutes, setMonthlyMinutes] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch recently played
                const historyRes = await fetch("/api/history?limit=50");
                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    if (historyData.success) {
                        setRecentlyPlayed(historyData.data || []);
                    }
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

                // Fetch recommendations
                const recRes = await fetch("/api/recommendations");
                if (recRes.ok) {
                    const recData = await recRes.json();
                    if (recData.success && recData.recommendations) {
                        // Combine all recommendation categories and take first 10
                        const allRecs = [
                            ...recData.recommendations.suggested,
                            ...recData.recommendations.artistsYouMightLike,
                            ...recData.recommendations.freshDiscoveries,
                            ...recData.recommendations.basedOnRecent,
                            ...recData.recommendations.trendingInYourStyle,
                        ].slice(0, 10);
                        setRecommendations(allRecs);
                    }
                }

                // Fetch monthly listening hours
                const summaryRes = await fetch("/api/history/summary");
                if (summaryRes.ok) {
                    const summaryData = await summaryRes.json();
                    if (summaryData.success) {
                        setMonthlyMinutes(summaryData.totalListenMinutes ?? 0);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
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
                    body: JSON.stringify(song),
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
        <div className={styles.page}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerIcon}>
                            <Music size={48} />
                        </div>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.headerTitle}>
                                Good {getTimeGreeting()}
                            </h1>
                            <p className={styles.headerSubtitle}>
                                Ready to discover some great music?
                            </p>
                        </div>
                    </div>
                    <div className={styles.statsRow}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Clock size={20} />
                            </div>
                            <div>
                                <div className={styles.statLabel}>Listening this month (sync across devices)</div>
                                <div className={styles.statValue}>
                                    {monthlyMinutes === null ? "—" : `${monthlyMinutes} min`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <section className={styles.quickActions}>
                    <Link href="/search" className={styles.actionCard}>
                        <div className={styles.actionIcon}>
                            <Search size={28} />
                        </div>
                        <span>Search Songs</span>
                    </Link>
                    <Link href="/library" className={styles.actionCard}>
                        <div className={styles.actionIcon}>
                            <Heart size={28} fill="currentColor" />
                        </div>
                        <span>Liked Songs</span>
                    </Link>
                </section>

                {/* Recommended For You */}
                {recommendations.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3 className={styles.sectionTitle}>
                                <Sparkles size={20} />
                                Recommended For You
                            </h3>
                            <Link href="/recommendations" className={styles.seeAll}>
                                See All
                            </Link>
                        </div>

                        <div className={styles.songList}>
                            {recommendations.map((song, index) => (
                                <SongCard
                                    key={`${song.videoId}-${index}`}
                                    song={song}
                                    songs={recommendations}
                                    index={index}
                                    onLike={handleLike}
                                    isLiked={likedSongIds.has(song.videoId)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Recently Played */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                        <Music size={20} />
                        Recently Played
                    </h3>

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
                            <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.6 }}>
                                <Music size={48} />
                            </div>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                                No recently played songs
                            </h3>
                            <p style={{ marginBottom: "1.5rem" }}>
                                Start playing songs to see them here
                            </p>
                            <Link href="/search" className={styles.emptyLink}>
                                Start exploring music
                            </Link>
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
