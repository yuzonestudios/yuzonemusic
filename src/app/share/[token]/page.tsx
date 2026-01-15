"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import styles from "./share.module.css";

interface SharedContent {
    type: "playlist" | "song";
    data: any;
}

export default function SharePage() {
    const params = useParams();
    const token = params.token as string;
    const [content, setContent] = useState<SharedContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const fetchSharedContent = async () => {
            try {
                const response = await fetch(`/api/share/${token}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to load shared content");
                }
                const data = await response.json();
                setContent(data.content);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchSharedContent();
        }
    }, [token]);

    if (loading) {
        return (
            <div className={`${styles.container} flex justify-center items-center`}>
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${styles.container}`}>
                <div className={`${styles.errorCard} glass-panel`}>
                    <h1 className={styles.errorTitle}>Unable to Load</h1>
                    <p className={styles.errorMessage}>{error}</p>
                </div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className={`${styles.container}`}>
                <div className={`${styles.errorCard} glass-panel`}>
                    <h1 className={styles.errorTitle}>Content Not Found</h1>
                </div>
            </div>
        );
    }

    if (content.type === "playlist") {
        const playlist = content.data;
        return (
            <div className={`${styles.container}`}>
                <div className={`${styles.header} glass-panel`}>
                    {playlist.thumbnail && (
                        <img
                            src={playlist.thumbnail}
                            alt={playlist.name}
                            className={styles.thumbnail}
                        />
                    )}
                    <div className={styles.info}>
                        <h1 className={styles.title}>{playlist.name}</h1>
                        {playlist.description && (
                            <p className={styles.description}>{playlist.description}</p>
                        )}
                        <p className={styles.meta}>
                            {playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}
                        </p>
                    </div>
                </div>

                <div className={`${styles.songs} glass-panel`}>
                    <h2 className={styles.songsTitle}>Songs</h2>
                    {playlist.songs.length === 0 ? (
                        <p className={styles.empty}>No songs in this playlist</p>
                    ) : (
                        <div className={styles.songsList}>
                            {playlist.songs.map(
                                (song: any, index: number) => (
                                    <div key={song.videoId} className={styles.songItem}>
                                        <div className={styles.songNumber}>{index + 1}</div>
                                        {song.thumbnail && (
                                            <img
                                                src={song.thumbnail}
                                                alt={song.title}
                                                className={styles.songThumbnail}
                                            />
                                        )}
                                        <div className={styles.songInfo}>
                                            <p className={styles.songTitle}>{song.title}</p>
                                            <p className={styles.songArtist}>{song.artist}</p>
                                        </div>
                                        <span className={styles.duration}>{song.duration}</span>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.container}`}>
            <div className={`${styles.errorCard} glass-panel`}>
                <h1 className={styles.errorTitle}>Content Type Not Supported</h1>
            </div>
        </div>
    );
}
