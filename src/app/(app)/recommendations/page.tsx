"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import { Sparkles, RefreshCw } from "lucide-react";
import styles from "./recommendations.module.css";

interface Song {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    reason: string;
}

interface RecommendationsData {
    basedOnRecent: Song[];
    moreFromArtists: Song[];
    trendingInYourStyle: Song[];
    discovery: Song[];
}

export default function RecommendationsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
    const [topArtists, setTopArtists] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            fetchRecommendations();
        }
    }, [status, router]);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            setError("");
            
            const res = await fetch("/api/recommendations");
            const data = await res.json();

            if (data.success) {
                setRecommendations(data.recommendations);
                setTopArtists(data.topArtists || []);
            } else {
                setError(data.error || "Failed to load recommendations");
            }
        } catch (err) {
            console.error("Error fetching recommendations:", err);
            setError("Failed to load recommendations");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchRecommendations();
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <ErrorState
                    message={error}
                    onRetry={fetchRecommendations}
                />
            </div>
        );
    }

    const hasRecommendations = recommendations && (
        recommendations.basedOnRecent.length > 0 ||
        recommendations.moreFromArtists.length > 0 ||
        recommendations.trendingInYourStyle.length > 0 ||
        recommendations.discovery.length > 0
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <Sparkles className={styles.headerIcon} />
                    <h1 className={styles.title}>For You</h1>
                </div>
                <button
                    className={styles.refreshButton}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Refresh recommendations"
                >
                    <RefreshCw className={refreshing ? styles.spinning : ""} />
                </button>
            </div>

            {topArtists.length > 0 && (
                <div className={styles.topArtists}>
                    <p className={styles.topArtistsText}>
                        Your top artists: <strong>{topArtists.join(", ")}</strong>
                    </p>
                </div>
            )}

            {!hasRecommendations ? (
                <div className={styles.emptyState}>
                    <Sparkles size={64} className={styles.emptyIcon} />
                    <h2>Start Your Musical Journey</h2>
                    <p>
                        Listen to songs and like your favorites to get personalized recommendations
                    </p>
                </div>
            ) : (
                <div className={styles.sections}>
                    {recommendations.basedOnRecent.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Because You Played</h2>
                            <div className={styles.grid}>
                                {recommendations.basedOnRecent.map((song) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.basedOnRecent}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.moreFromArtists.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>More From Your Artists</h2>
                            <div className={styles.grid}>
                                {recommendations.moreFromArtists.map((song) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.moreFromArtists}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.trendingInYourStyle.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Trending In Your Style</h2>
                            <div className={styles.grid}>
                                {recommendations.trendingInYourStyle.map((song) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.trendingInYourStyle}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.discovery.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Discover New Music</h2>
                            <div className={styles.grid}>
                                {recommendations.discovery.map((song) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.discovery}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
