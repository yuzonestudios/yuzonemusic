"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Heart, Maximize } from "lucide-react";
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
        duration,
        repeat,
        shuffle,
        togglePlay,
        nextSong,
        previousSong,
        setVolume,
        toggleRepeat,
        toggleShuffle,
        openFullscreen,
        seekTo,
    } = usePlayerStore();

    const { seek } = useAudioPlayer();
    useKeyboardShortcuts();
    const [isLiked, setIsLiked] = useState(false);

    // Store the seek function in the store for FullscreenPlayer to use
    useEffect(() => {
        seekTo as any; // Just to reference it
        // We'll use a ref to avoid dependency issues
    }, [seekTo]);

    const handleSeek = (time: number) => {
        seek(time);
        seekTo(time);
    };

    // Track song play in history & Check Like Status
    useEffect(() => {
        if (currentSong) {
            console.log("Tracking song:", currentSong);
            
            // 1. Check if liked
            const checkLike = async () => {
                try {
                    const res = await fetch(`/api/liked?check=${currentSong.videoId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            setIsLiked(data.isLiked);
                        }
                    } else {
                        const error = await res.json();
                        console.error("Failed to check like status:", res.status, error);
                    }
                } catch (e) {
                    console.error("Error checking like status:", e);
                }
            };
            checkLike();

            // 2. Track in history
            const trackHistory = async () => {
                try {
                    const res = await fetch("/api/history", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(currentSong),
                    });
                    
                    if (!res.ok) {
                        const error = await res.json();
                        console.error("Failed to track history:", res.status, error);
                        console.error("Song data sent:", currentSong);
                    } else {
                        console.log("Successfully tracked history for:", currentSong.title);
                    }
                } catch (e) {
                    console.error("Error tracking history:", e);
                }
            };
            trackHistory();
        }
    }, [currentSong?.videoId]);

    const toggleLike = async () => {
        if (!currentSong) return;

        const newLiked = !isLiked;
        setIsLiked(newLiked);

        try {
            if (newLiked) {
                const res = await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(currentSong),
                });
                
                if (!res.ok) {
                    console.error("Failed to like song:", res.status);
                    setIsLiked(!newLiked); // Revert on error
                } else {
                    // Dispatch custom event for other components to listen
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: currentSong.videoId, liked: true }
                    }));
                }
            } else {
                const res = await fetch(`/api/liked?videoId=${currentSong.videoId}`, {
                    method: "DELETE",
                });
                
                if (!res.ok) {
                    console.error("Failed to unlike song:", res.status);
                    setIsLiked(!newLiked); // Revert on error
                } else {
                    // Dispatch custom event for other components to listen
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: currentSong.videoId, liked: false }
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to toggle like:", error);
            setIsLiked(!newLiked); // Revert on error
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        handleSeek(percent * duration);
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
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                        </svg>
                    </button>

                    <button
                        onClick={toggleShuffle}
                        className={`${styles.controlBtn} ${styles.secondary} ${shuffle ? styles.active : ""}`}
                        disabled={!currentSong}
                        title={shuffle ? "Shuffle: On" : "Shuffle: Off"}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 3 21 3 21 8" />
                            <line x1="4" y1="20" x2="21" y2="3" />
                            <polyline points="21 16 21 21 16 21" />
                            <line x1="15" y1="15" x2="21" y2="21" />
                            <line x1="4" y1="4" x2="9" y2="9" />
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

                    <button
                        onClick={openFullscreen}
                        className={`${styles.controlBtn} ${styles.secondary}`}
                        disabled={!currentSong}
                        title="Fullscreen Player"
                    >
                        <Maximize size={18} />
                    </button>

                    <a
                        href={currentSong ? `/api/stream?id=${currentSong.videoId}` : "#"}
                        download={currentSong ? `${currentSong.title}.mp3` : undefined}
                        className={`${styles.controlBtn} ${styles.secondary}`}
                        title="Download"
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
