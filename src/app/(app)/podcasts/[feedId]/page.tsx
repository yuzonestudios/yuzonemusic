"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import PodcastEpisodeCard from "@/components/cards/PodcastEpisodeCard";
import type { PodcastEpisode, PodcastShow } from "@/types";
import styles from "./page.module.css";

interface EpisodesResponse {
    episodes: PodcastEpisode[];
    nextBefore?: number | null;
}

function formatDate(isoDate?: string) {
    if (!isoDate) return "";
    try {
        return new Date(isoDate).toLocaleDateString();
    } catch {
        return "";
    }
}

export default function PodcastEpisodesPage() {
    const params = useParams();
    const feedParam = Array.isArray(params?.feedId) ? params?.feedId[0] : params?.feedId;
    const feedId = typeof feedParam === "string" ? Number.parseInt(feedParam, 10) : Number.NaN;
    const [show, setShow] = useState<PodcastShow | null>(null);
    const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextBefore, setNextBefore] = useState<number | null>(null);

    const canLoadMore = useMemo(() => nextBefore !== null, [nextBefore]);

    useEffect(() => {
        if (!feedParam) {
            return;
        }
        if (!Number.isFinite(feedId)) {
            setError("Invalid podcast feed ID.");
            setLoading(false);
            return;
        }

        const loadInitial = async () => {
            setLoading(true);
            setError(null);
            try {
                const [showRes, episodesRes] = await Promise.all([
                    fetch(`/api/podcasts/show?feedId=${feedId}`),
                    fetch(`/api/podcasts/episodes?feedId=${feedId}&limit=20`),
                ]);

                if (!showRes.ok) {
                    throw new Error("Failed to load podcast show.");
                }
                if (!episodesRes.ok) {
                    throw new Error("Failed to load podcast episodes.");
                }

                const showData = await showRes.json();
                const episodesData = (await episodesRes.json()) as EpisodesResponse;

                if (showData.success) {
                    setShow(showData.data as PodcastShow);
                } else {
                    throw new Error(showData.error || "Failed to load podcast show.");
                }

                setEpisodes(episodesData.episodes || []);
                setNextBefore(typeof episodesData.nextBefore === "number" ? episodesData.nextBefore : null);
            } catch (err: any) {
                setError(err.message || "Failed to load podcast episodes.");
            } finally {
                setLoading(false);
            }
        };

        loadInitial();
    }, [feedId, feedParam]);

    const loadMore = async () => {
        if (!canLoadMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const url = `/api/podcasts/episodes?feedId=${feedId}&limit=20&before=${nextBefore}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error("Failed to load more episodes.");
            }
            const data = (await res.json()) as EpisodesResponse;
            setEpisodes((prev) => [...prev, ...(data.episodes || [])]);
            setNextBefore(typeof data.nextBefore === "number" ? data.nextBefore : null);
        } catch (err: any) {
            setError(err.message || "Failed to load more episodes.");
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <Link href="/search" className={styles.backLink}>
                    <ArrowLeft size={16} /> Back to search
                </Link>
                {show && (
                    <div className={styles.showHeader}>
                        <img
                            src={show.thumbnail || show.image || "/placeholder-album.png"}
                            alt={show.title}
                            className={styles.showImage}
                        />
                        <div className={styles.showInfo}>
                            <h1 className={styles.showTitle}>{show.title}</h1>
                            <p className={styles.showMeta}>{show.author || "Podcast"}</p>
                            {show.description && (
                                <p className={styles.showDescription}>{show.description}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className={styles.loading}>Loading episodes...</div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : (
                <>
                    <div className={styles.episodesHeader}>
                        <h2>Episodes</h2>
                        <span className={styles.episodesMeta}>
                            <Calendar size={14} /> Sorted by newest
                        </span>
                    </div>
                    <div className={styles.episodesList}>
                        {episodes.map((episode, index) => (
                            <PodcastEpisodeCard
                                key={`${episode.feedId}-${episode.episodeId}`}
                                episode={episode}
                                episodes={episodes}
                                index={index}
                            />
                        ))}
                    </div>
                    {canLoadMore && (
                        <button
                            type="button"
                            className={styles.loadMore}
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? "Loading..." : "Load next 20"}
                        </button>
                    )}
                    {!canLoadMore && episodes.length > 0 && (
                        <div className={styles.endNote}>You have reached the end.</div>
                    )}
                </>
            )}
        </div>
    );
}
