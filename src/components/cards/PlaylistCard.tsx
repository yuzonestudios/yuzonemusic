"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Music, Play, Trash2 } from "lucide-react";
import styles from "./PlaylistCard.module.css";

interface PlaylistCardProps {
    playlist: {
        _id: string;
        name: string;
        description?: string;
        thumbnail?: string;
        songCount: number;
        createdAt: string;
    };
    onDelete?: (playlistId: string) => void;
    onPlay?: (playlistId: string) => void;
}

export default function PlaylistCard({ playlist, onDelete, onPlay }: PlaylistCardProps) {
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!confirm(`Delete playlist "${playlist.name}"?`)) {
            return;
        }

        if (onDelete) {
            onDelete(playlist._id);
        }
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPlay && playlist.songCount > 0) {
            onPlay(playlist._id);
        }
    };

    const handleClick = () => {
        router.push(`/playlists/${playlist._id}`);
    };

    return (
        <div className={styles.playlistCard} onClick={handleClick}>
            <div className={styles.playlistHeader}>
                <div className={styles.playlistThumbnail}>
                    {playlist.thumbnail ? (
                        <Image
                            src={playlist.thumbnail}
                            alt={playlist.name}
                            width={80}
                            height={80}
                        />
                    ) : (
                        <Music size={32} className={styles.playlistIcon} />
                    )}
                </div>
                <div className={styles.playlistInfo}>
                    <h3 className={styles.playlistName}>{playlist.name}</h3>
                    <div className={styles.playlistMeta}>
                        <span>{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</span>
                    </div>
                </div>
            </div>

            {playlist.description && (
                <p className={styles.playlistDescription}>
                    {playlist.description}
                </p>
            )}

            <div className={styles.playlistActions}>
                <button
                    className={`${styles.actionBtn} ${styles.playBtn}`}
                    onClick={handlePlay}
                    disabled={playlist.songCount === 0}
                >
                    <Play size={16} />
                    Play
                </button>
                <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={handleDelete}
                >
                    <Trash2 size={16} />
                    Delete
                </button>
            </div>
        </div>
    );
}
