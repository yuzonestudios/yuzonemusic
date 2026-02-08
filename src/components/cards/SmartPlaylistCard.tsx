"use client";

import Image from "next/image";
import { Music, Play } from "lucide-react";
import styles from "./PlaylistCard.module.css";

interface SmartPlaylistCardProps {
    playlist: {
        id: string;
        name: string;
        description: string;
        thumbnail?: string;
        songCount: number;
    };
    onPlay: (playlistId: string) => void;
}

export default function SmartPlaylistCard({ playlist, onPlay }: SmartPlaylistCardProps) {
    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (playlist.songCount > 0) {
            onPlay(playlist.id);
        }
    };

    return (
        <div className={styles.playlistCard}>
            <div className={styles.playlistHeader}>
                <div className={styles.playlistThumbnail}>
                    {playlist.thumbnail ? (
                        <Image
                            src={playlist.thumbnail}
                            alt={playlist.name}
                            width={80}
                            height={80}
                            sizes="80px"
                        />
                    ) : (
                        <Music size={32} className={styles.playlistIcon} />
                    )}
                </div>
                <div className={styles.playlistInfo}>
                    <h3 className={styles.playlistName}>{playlist.name}</h3>
                    <div className={styles.playlistMeta}>
                        <span>{playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}</span>
                    </div>
                </div>
            </div>

            <p className={styles.playlistDescription}>{playlist.description}</p>

            <div className={styles.playlistActions}>
                <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.playBtn}`}
                    onClick={handlePlay}
                    disabled={playlist.songCount === 0}
                >
                    <Play size={16} />
                    Play
                </button>
            </div>
        </div>
    );
}
