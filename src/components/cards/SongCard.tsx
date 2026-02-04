"use client";

import { useState } from "react";
import Image from "next/image";
import { ListPlus, Play, Pause, Check, ListMusic, Trash2 } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import AddToPlaylistModal from "@/components/ui/AddToPlaylistModal";
import ArtistModal from "@/components/ui/ArtistModal";
import type { Song } from "@/types";
import styles from "./SongCard.module.css";

interface SongCardProps {
    song: Song;
    songs?: Song[];
    index?: number;
    showActions?: boolean;
    onLike?: (song: Song) => void;
    isLiked?: boolean;
    hideAddToPlaylist?: boolean;
    hideAddToQueue?: boolean;
    onRemoveFromPlaylist?: (videoId: string) => void;
    sourceType?: "playlist" | "album" | "search" | "library" | "other";
    sourceId?: string;
    sourceName?: string;
    onPlay?: () => void;
}

export default function SongCard({
    song,
    songs,
    index = 0,
    showActions = true,
    onLike,
    isLiked = false,
    hideAddToPlaylist = false,
    hideAddToQueue = false,
    onRemoveFromPlaylist,
    sourceType = "other",
    sourceId,
    sourceName,
    onPlay,
}: SongCardProps) {
    const { currentSong, setQueue, isPlaying, togglePlay, setCurrentSong, play, ensurePlayback, addToQueue, setQueueSource } = usePlayerStore();
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [addedToPlaylist, setAddedToPlaylist] = useState(false);
    const [queued, setQueued] = useState(false);
    const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);

    const isCurrentSong = currentSong?.videoId === song.videoId;

    const handlePlay = () => {
        if (isCurrentSong) {
            togglePlay();
        } else if (songs && songs.length > 0) {
            setQueue(songs, index);
            // Set the queue source context
            setQueueSource({ type: sourceType, id: sourceId, name: sourceName });
            play();
            // Call onPlay callback to close modals
            onPlay?.();
            // Small delay to ensure audio element is ready
            setTimeout(() => ensurePlayback(), 50);
        } else {
            setCurrentSong(song);
            // Set the queue source context for single songs
            setQueueSource({ type: sourceType, id: sourceId, name: sourceName });
            play();
            // Call onPlay callback to close modals
            onPlay?.();
            // Small delay to ensure audio element is ready
            setTimeout(() => ensurePlayback(), 50);
        }
    };

    const handleAddToQueue = () => {
        addToQueue(song);
        setQueued(true);
        setTimeout(() => setQueued(false), 1500);
    };

    const handlePlaylistModalClose = () => {
        setIsPlaylistModalOpen(false);
        // Reset the addedToPlaylist state when modal closes
        // Only keep it if the song was actually added (will be reset by AddToPlaylistModal)
        setTimeout(() => {
            setAddedToPlaylist(false);
        }, 1500);
    };

    return (
        <div className={`${styles.card} ${isCurrentSong ? styles.playing : ""} ${isPlaylistModalOpen ? styles.modalOpen : ""}`}>
            <div className={styles.thumbnail} onClick={handlePlay}>
                {song.thumbnail && song.thumbnail.trim() !== "" ? (
                    <Image
                        src={song.thumbnail.replace(/=w\d+-h\d+/, '=w240-h240')}
                        alt={song.title}
                        width={120}
                        height={120}
                        quality={80}
                        sizes="(max-width: 640px) 100px, 120px"
                        className={styles.thumbnailImg}
                        unoptimized={song.thumbnail.includes('ytimg.com') || song.thumbnail.includes('ggpht.com')}
                    />
                ) : (
                    <div className={styles.placeholderThumbnail}>
                        <span>No Image</span>
                    </div>
                )}
                <div className={styles.overlay}>
                    {isCurrentSong && isPlaying ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </div>
                {isCurrentSong && isPlaying && (
                    <div className={styles.nowPlaying}>
                        <span className={styles.bar}></span>
                        <span className={styles.bar}></span>
                        <span className={styles.bar}></span>
                    </div>
                )}
            </div>

            <div className={styles.info}>
                <span className={styles.title}>{song.title}</span>
                <span 
                    className={styles.artist}
                    onClick={() => setIsArtistModalOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            setIsArtistModalOpen(true);
                        }
                    }}
                >
                    {song.artist}
                </span>
            </div>

            <span className={styles.duration}>{song.duration}</span>

            {showActions && (
                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={handlePlay}
                        className={styles.playBtn}
                        title={isCurrentSong && isPlaying ? "Pause" : "Play"}
                    >
                        {isCurrentSong && isPlaying ? (
                            <Pause size={16} fill="currentColor" />
                        ) : (
                            <Play size={16} fill="currentColor" />
                        )}
                    </button>
                    {!hideAddToQueue && (
                        <button
                            onClick={handleAddToQueue}
                            className={`${styles.actionBtn} ${queued ? styles.added : ""}`}
                            title={queued ? "Added to Queue" : "Add to Queue"}
                        >
                            {queued ? <Check size={20} /> : <ListMusic size={20} />}
                        </button>
                    )}
                    {!hideAddToPlaylist && (
                        <button
                            onClick={() => setIsPlaylistModalOpen(true)}
                            className={`${styles.actionBtn} ${addedToPlaylist ? styles.added : ""}`}
                            title={addedToPlaylist ? "Added to Playlist" : "Add to Playlist"}
                        >
                            {addedToPlaylist ? <Check size={20} /> : <ListPlus size={20} />}
                        </button>
                    )}
                    {onRemoveFromPlaylist && (
                        <button
                            onClick={() => onRemoveFromPlaylist(song.videoId)}
                            className={styles.actionBtn}
                            title="Remove from Playlist"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            )}

            <AddToPlaylistModal
                isOpen={isPlaylistModalOpen}
                onClose={handlePlaylistModalClose}
                song={song}
                onAddSuccess={() => setAddedToPlaylist(true)}
            />

            <ArtistModal
                isOpen={isArtistModalOpen}
                artistName={song.artist}
                onClose={() => setIsArtistModalOpen(false)}
            />
        </div>
    );
}
