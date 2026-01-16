"use client";

import { useState } from "react";
import Image from "next/image";
import { ListPlus, Play, Pause, Check } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import AddToPlaylistModal from "@/components/ui/AddToPlaylistModal";
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
}

export default function SongCard({
    song,
    songs,
    index = 0,
    showActions = true,
    onLike,
    isLiked = false,
    hideAddToPlaylist = false,
}: SongCardProps) {
    const { currentSong, setQueue, isPlaying, togglePlay, setCurrentSong, play, ensurePlayback } = usePlayerStore();
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [addedToPlaylist, setAddedToPlaylist] = useState(false);

    const isCurrentSong = currentSong?.videoId === song.videoId;

    const handlePlay = () => {
        if (isCurrentSong) {
            togglePlay();
        } else if (songs && songs.length > 0) {
            setQueue(songs, index);
            play();
            // Small delay to ensure audio element is ready
            setTimeout(() => ensurePlayback(), 50);
        } else {
            setCurrentSong(song);
            play();
            // Small delay to ensure audio element is ready
            setTimeout(() => ensurePlayback(), 50);
        }
    };

    return (
        <div className={`${styles.card} ${isCurrentSong ? styles.playing : ""}`}>
            <div className={styles.thumbnail} onClick={handlePlay}>
                <Image
                    src={song.thumbnail.replace(/=w\d+-h\d+/, '=w240-h240')}
                    alt={song.title}
                    width={120}
                    height={120}
                    quality={80}
                    className={styles.thumbnailImg}
                />
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
                <span className={styles.artist}>{song.artist}</span>
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
                    {onLike && (
                        <button
                            onClick={() => onLike(song)}
                            className={`${styles.actionBtn} ${isLiked ? styles.liked : ""}`}
                            title={isLiked ? "Unlike" : "Like"}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </button>
                    )}
                    {!hideAddToPlaylist && (
                        <button
                            onClick={() => { setAddedToPlaylist(true); setIsPlaylistModalOpen(true); }}
                            className={`${styles.actionBtn} ${addedToPlaylist ? styles.added : ""}`}
                            title={addedToPlaylist ? "Added to Playlist" : "Add to Playlist"}
                        >
                            {addedToPlaylist ? <Check size={20} /> : <ListPlus size={20} />}
                        </button>
                    )}
                </div>
            )}

            <AddToPlaylistModal
                isOpen={isPlaylistModalOpen}
                onClose={() => setIsPlaylistModalOpen(false)}
                song={song}
            />
        </div>
    );
}
