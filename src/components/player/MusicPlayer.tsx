"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Heart } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import styles from "./MusicPlayer.module.css";

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MusicPlayer() {
    const {
        currentSong,
        isPlaying,
        volume,
        currentTime,
        currentTime,
        duration,
        repeat,
        togglePlay,
        nextSong,
        previousSong,
        setVolume,
        toggleRepeat,
    } = usePlayerStore();

    const { seek } = useAudioPlayer();
    useKeyboardShortcuts();
    const [isLiked, setIsLiked] = useState(false);

    // Track song play in history & Check Like Status
    useEffect(() => {
        if (currentSong) {
            // 1. Check if liked
            const checkLike = async () => {
                try {
                    const res = await fetch(`/api/liked?check=${currentSong.videoId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) setIsLiked(data.isLiked);
                    }
                } catch (e) {
                    console.error("Failed to check like status:", e);
                }
            };
            checkLike();

            // 2. Track history if playing
            if (isPlaying) {
                const trackPlay = async () => {
                    try {
                        await fetch("/api/history", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(currentSong),
                        });
                    } catch (error) {
                        console.error("Failed to track play:", error);
                    }
                };
                trackPlay();
            }
        }
    }, [currentSong?.videoId, isPlaying]);

    const toggleLike = async () => {
        if (!currentSong) return;

        // Optimistic update
        setIsLiked(!isLiked);

        try {
            if (isLiked) {
                await fetch(`/api/liked?videoId=${currentSong.videoId}`, { method: "DELETE" });
            } else {
                await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(currentSong),
                });
            }
        } catch (error) {
            console.error("Failed to toggle like:", error);
            setIsLiked(prev => !prev); // Revert on error
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        seek(percent * duration);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <footer className={styles.player}>
            {/* Song Info */}
            <div className={styles.songInfo}>
                {currentSong ? (
                    <>
                        <div className={styles.thumbnail}>
                            <Image
                                src={currentSong.thumbnail}
                                alt={currentSong.title}
                                width={56}
                                height={56}
                                className={styles.thumbnailImg}
                            />
                        </div>
                        <div className={styles.songDetails}>
                            <span className={styles.songTitle}>{currentSong.title}</span>
                            <span className={styles.songArtist}>{currentSong.artist}</span>
                        </div>
                        <button
                            onClick={toggleLike}
                            className={`${styles.likeBtn} ${isLiked ? styles.active : ""}`}
                            title={isLiked ? "Unlike" : "Like"}
                        >
                            <Heart size={20} fill={isLiked ? "var(--accent-primary)" : "none"} stroke={isLiked ? "var(--accent-primary)" : "currentColor"} />
                        </button>
                    </>
                ) : (
                    <div className={styles.noSong}>
                        <span>No song playing</span>
                    </div>
                )}
            </div>

            {/* Player Controls */}
            <div className={styles.controls}>
                <div className={styles.buttons}>
                    <button
                        onClick={previousSong}
                        className={`${styles.controlBtn} ${styles.secondary}`}
                        disabled={!currentSong}
                        title="Previous"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
                        </svg>
                    </button>

                    <button
                        onClick={togglePlay}
                        className={`${styles.controlBtn} ${styles.primary}`}
                        disabled={!currentSong}
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={nextSong}
                        className={`${styles.controlBtn} ${styles.secondary}`}
                        disabled={!currentSong}
                        title="Next"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
                        </svg>
                    </button>

                    <button
                        onClick={toggleRepeat}
                        className={`${styles.controlBtn} ${styles.secondary} ${repeat !== "off" ? styles.active : ""}`}
                        disabled={!currentSong}
                        title={`Repeat: ${repeat}`}
                    >
                        {repeat === "one" ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 1l4 4-4 4" />
                                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <path d="M7 23l-4-4 4-4" />
                                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                <text x="12" y="14" fontSize="8" fill="currentColor" textAnchor="middle">1</text>
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 1l4 4-4 4" />
                                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <path d="M7 23l-4-4 4-4" />
                                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                        )}
                    </button>

                    <a
                        href={currentSong ? `/api/stream?id=${currentSong.videoId}` : "#"}
                        download={currentSong ? `${currentSong.title}.mp3` : undefined}
                        className={`${styles.controlBtn} ${styles.secondary}`}
                        title="Download"
                        style={{
                            pointerEvents: currentSong ? 'auto' : 'none',
                            opacity: currentSong ? 1 : 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Download size={18} />
                    </a>
                </div>

                {/* Progress Bar */}
                <div className={styles.progressWrapper}>
                    <span className={styles.time}>{formatTime(currentTime)}</span>
                    <div className={styles.progressBar} onClick={handleProgressClick}>
                        <div className={styles.progressBg}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <span className={styles.time}>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Volume Control */}
            <div className={styles.volumeControl}>
                <button
                    onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
                    className={styles.volumeBtn}
                    title={volume > 0 ? "Mute" : "Unmute"}
                >
                    {volume === 0 ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5L6 9H2v6h4l5 4V5z" />
                            <line x1="23" y1="9" x2="17" y2="15" />
                            <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                    ) : volume < 0.5 ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5L6 9H2v6h4l5 4V5z" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5L6 9H2v6h4l5 4V5z" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                    )}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className={styles.volumeSlider}
                />
            </div>
        </footer>
    );
}
