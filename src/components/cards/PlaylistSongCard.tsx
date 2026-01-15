"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import type { Song } from "@/types";
import styles from "./SongCard.module.css";

interface PlaylistSongCardProps {
    song: Song;
    songs?: Song[];
    index?: number;
    onRemove?: (videoId: string) => void;
}

export default function PlaylistSongCard({
    song,
    songs,
    index = 0,
    onRemove,
}: PlaylistSongCardProps) {
    const { currentSong, setQueue, isPlaying, togglePlay, setCurrentSong } = usePlayerStore();

    const isCurrentSong = currentSong?.videoId === song.videoId;

    const handlePlay = () => {
        if (isCurrentSong) {
            togglePlay();
        } else if (songs && songs.length > 0) {
            setQueue(songs, index);
        } else {
            setCurrentSong(song);
        }
    };

    return (
        <div className={`${styles.card} ${isCurrentSong ? styles.playing : ""}`}>
            <div className={styles.thumbnail} onClick={handlePlay}>
                <Image
                    src={song.thumbnail}
                    alt={song.title}
                    width={56}
                    height={56}
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

            {onRemove && (
                <div className={styles.actions}>
                    <button
                        onClick={() => onRemove(song.videoId)}
                        className={styles.actionBtn}
                        title="Remove from playlist"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
