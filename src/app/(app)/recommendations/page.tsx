"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import { Sparkles, RefreshCw } from "lucide-react";
import styles from "./recommendations.module.css";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

interface Song {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    reason: string;
}

interface RecommendationsData {
    suggested: Song[];
    artistsYouMightLike: Song[];
    basedOnRecent: Song[];
    trendingInYourStyle: Song[];
    freshDiscoveries: Song[];
    forYouMix: Song[];
    weeklyDiscovery: Song[];
}

export default function RecommendationsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const refreshKeyRef = useRef(0);

    const { data, error, mutate, isLoading } = useSWR(
        status === "authenticated" ? `/api/recommendations?refresh=${refreshKeyRef.current}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            focusThrottleInterval: 300000,
            onError: () => setRefreshing(false),
            onSuccess: () => setRefreshing(false),
        }
    );

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            mutate();
        }
    }, [status, router, mutate]);

    const handleRefresh = () => {
        setRefreshing(true);
        refreshKeyRef.current += 1;
        mutate();
    };

    if (isLoading) {
        return (
            <div className={`${styles.container} ${styles.loading}`}>
                <LoadingSpinner text="Curating your personalized music recommendations..." />
            </div>
        );
    }

    if (error || !data?.success) {
        return (
            <div className={styles.container}>
                <ErrorState
                    message={error?.message || data?.error || "Failed to load recommendations"}
                    onRetry={() => mutate()}
                />
            </div>
        );
    }

    const recommendations = data?.recommendations
        ? {
            ...data.recommendations,
            forYouMix: data.recommendations.forYouMix || [],
            weeklyDiscovery: data.recommendations.weeklyDiscovery || [],
        } as RecommendationsData
        : undefined;
    const topArtists = data?.topArtists || [];

    const hasRecommendations = recommendations && (
        recommendations.suggested.length > 0 ||
        recommendations.artistsYouMightLike.length > 0 ||
        recommendations.basedOnRecent.length > 0 ||
        recommendations.trendingInYourStyle.length > 0 ||
        recommendations.freshDiscoveries.length > 0 ||
        recommendations.forYouMix.length > 0 ||
        recommendations.weeklyDiscovery.length > 0
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
                    {recommendations.forYouMix.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>For You Mix</h2>
                            <div className={styles.grid}>
                                {recommendations.forYouMix.map((song, index) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.forYouMix}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.weeklyDiscovery.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Weekly Discovery</h2>
                            <div className={styles.grid}>
                                {recommendations.weeklyDiscovery.map((song, index) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.weeklyDiscovery}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.suggested.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Songs You Might Like</h2>
                            <div className={styles.grid}>
                                {recommendations.suggested.map((song, index) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.suggested}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.artistsYouMightLike.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Artists You Might Like</h2>
                            <div className={styles.grid}>
                                {recommendations.artistsYouMightLike.map((song, index) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.artistsYouMightLike}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.basedOnRecent.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Because You Played</h2>
                            <div className={styles.grid}>
                                {recommendations.basedOnRecent.map((song, index) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.basedOnRecent}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.trendingInYourStyle.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Trending In Your Style</h2>
                            <div className={styles.grid}>
                                {recommendations.trendingInYourStyle.map((song, index) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.trendingInYourStyle}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {recommendations.freshDiscoveries.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Fresh Discoveries</h2>
                            <div className={styles.grid}>
                                {recommendations.freshDiscoveries.map((song, index) => (
                                    <SongCard
                                        key={song.videoId}
                                        song={song}
                                        songs={recommendations.freshDiscoveries}
                                        index={index}
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
