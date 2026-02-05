"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Music, Play, Trash2, Download } from "lucide-react";
import { useState } from "react";
import styles from "./PlaylistCard.module.css";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylistDownload } from "@/hooks/usePlaylistDownload";

interface PlaylistCardProps {
    playlist: {
        _id: string;
        name: string;
        description?: string;
        thumbnail?: string;
        songCount: number;
        createdAt: string;
        songs?: Array<{
            videoId: string;
            title: string;
            artist: string;
            thumbnail: string;
            duration: string;
        }>;
    };
    onDelete?: (playlistId: string) => void;
    onPlay?: (playlistId: string) => void;
}

export default function PlaylistCard({ playlist, onDelete, onPlay }: PlaylistCardProps) {
    const router = useRouter();
    const { isPlaying, queueSource } = usePlayerStore();
    const { isDownloading, error: downloadError, downloadPlaylist, clearError, reset } = usePlaylistDownload();
    const [showDownloadError, setShowDownloadError] = useState(false);

    const isPlayingFromThisPlaylist =
        isPlaying && queueSource?.type === "playlist" && queueSource?.id === playlist._id;

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

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!playlist.songs || playlist.songs.length === 0) {
            alert("No songs in this playlist to download");
            return;
        }

        const videoIds = playlist.songs.map((song) => song.videoId);
        await downloadPlaylist(videoIds, playlist.name);
    };

    const handleClick = () => {
        router.push(`/playlists/${playlist._id}`);
    };

    return (
        <div className={`${styles.playlistCard} ${isPlayingFromThisPlaylist ? styles.playing : ""}`} onClick={handleClick}>
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
                    {isPlayingFromThisPlaylist && (
                        <span className={styles.playingBadge}>Playing</span>
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
                    type="button"
                    className={`${styles.actionBtn} ${styles.playBtn}`}
                    onClick={handlePlay}
                    disabled={playlist.songCount === 0}
                >
                    <Play size={16} />
                    Play
                </button>
                <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.downloadBtn}`}
                    onClick={handleDownload}
                    disabled={playlist.songCount === 0 || isDownloading}
                    title="Download playlist as ZIP"
                >
                    <Download size={16} />
                    {isDownloading ? "Downloading..." : "Download"}
                </button>
                <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={handleDelete}
                >
                    <Trash2 size={16} />
                    Delete
                </button>
            </div>

            {downloadError && (
                <div className={styles.errorMessage}>
                    <p>{downloadError}</p>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            clearError();
                        }}
                        className={styles.dismissBtn}
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}
