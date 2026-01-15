"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, SkipBack, Play, Pause, SkipForward, Volume2, Repeat, Shuffle, Heart, ListPlus } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import AddToPlaylistModal from "@/components/ui/AddToPlaylistModal";
import styles from "./FullscreenPlayer.module.css";

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Get global audio element exposed by useAudioPlayer
const getAudioElement = () => {
    if (typeof window !== "undefined") {
        const audio = (window as any).__yuzoneAudio as HTMLAudioElement | undefined;
        return audio || null;
    }
    return null;
};

export default function FullscreenPlayer() {
    const {
        currentSong,
        isPlaying,
        volume,
        currentTime,
        duration,
        repeat,
        shuffle,
        isFullscreenOpen,
        togglePlay,
        nextSong,
        previousSong,
        setVolume,
        setCurrentTime,
        toggleRepeat,
        toggleShuffle,
        closeFullscreen,
    } = usePlayerStore();

    const [isLiked, setIsLiked] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

    useEffect(() => {
        if (!isFullscreenOpen) return;

        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isFullscreenOpen]);

    useEffect(() => {
        if (currentSong) {
            const checkLike = async () => {
                try {
                    const res = await fetch(`/api/liked?check=${currentSong.videoId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            setIsLiked(data.isLiked);
                        }
                    }
                } catch (e) {
                    console.error("Error checking like status:", e);
                }
            };
            checkLike();
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
                    setIsLiked(!newLiked);
                } else {
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: currentSong.videoId, liked: true }
                    }));
                }
            } else {
                const res = await fetch(`/api/liked?videoId=${currentSong.videoId}`, {
                    method: "DELETE",
                });
                if (!res.ok) {
                    setIsLiked(!newLiked);
                } else {
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: currentSong.videoId, liked: false }
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to toggle like:", error);
            setIsLiked(!newLiked);
        }
    };

    const oldUseEffect = useEffect(() => {
        if (!isFullscreenOpen) return;

        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isFullscreenOpen]);

    // This will replace the old useEffect, removing the duplicate

    if (!isFullscreenOpen) return null;

    const progress = duration ? (currentTime / duration) * 100 : 0;

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return;
        
        const audio = getAudioElement();
        if (!audio) {
            console.warn("Audio element not found for seeking");
            return;
        }
        
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(percent * duration, duration));
        
        // Directly set the currentTime and update store so UI reflects immediately
        audio.currentTime = newTime;
        setCurrentTime(newTime);
        console.log("Fullscreen seek to:", newTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                {/* Close Button */}
                <button onClick={closeFullscreen} className={styles.closeBtn} title="Close">
                    <X size={28} />
                </button>

                {/* Album Art */}
                <div className={styles.albumArtContainer}>
                    {currentSong ? (
                        <div className={styles.albumArt}>
                            <Image
                                src={currentSong.thumbnail}
                                alt={currentSong.title}
                                width={300}
                                height={300}
                                priority
                                className={styles.albumImage}
                            />
                            <div className={`${styles.albumGlow} ${isPlaying ? styles.playing : ""}`} />
                        </div>
                    ) : (
                        <div className={styles.noSongPlaceholder}>
                            <span>No Song Playing</span>
                        </div>
                    )}
                </div>

                {/* Song Info */}
                {currentSong && (
                    <div className={styles.songInfo}>
                        <h1 className={styles.title}>{currentSong.title}</h1>
                        <p className={styles.artist}>{currentSong.artist}</p>
                    </div>
                )}

                {/* Progress Bar */}
                <div className={styles.progressSection}>
                    <div className={styles.progressBar} onClick={handleProgressClick}>
                        <div className={styles.progressBg}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <div className={styles.timeInfo}>
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className={styles.controls}>
                    <button
                        onClick={toggleShuffle}
                        className={`${styles.controlBtn} ${shuffle ? styles.active : ""}`}
                        title={shuffle ? "Shuffle: On" : "Shuffle: Off"}
                        disabled={!currentSong}
                    >
                        <Shuffle size={22} />
                    </button>

                    <button
                        onClick={previousSong}
                        className={styles.controlBtn}
                        disabled={!currentSong}
                        title="Previous"
                    >
                        <SkipBack size={24} />
                    </button>

                    <button
                        onClick={togglePlay}
                        className={`${styles.playBtn}`}
                        disabled={!currentSong}
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                    </button>

                    <button
                        onClick={nextSong}
                        className={styles.controlBtn}
                        disabled={!currentSong}
                        title="Next"
                    >
                        <SkipForward size={24} />
                    </button>

                    <button
                        onClick={toggleRepeat}
                        className={`${styles.controlBtn} ${repeat !== "off" ? styles.active : ""}`}
                        title={`Repeat: ${repeat}`}
                        disabled={!currentSong}
                    >
                        {repeat === "one" ? (
                            <span className={styles.repeatOne}>
                                <Repeat size={22} />
                                <span className={styles.repeatText}>1</span>
                            </span>
                        ) : (
                            <Repeat size={22} />
                        )}
                    </button>
                </div>

                {/* Secondary Controls */}
                <div className={styles.secondaryControls}>
                    <button
                        onClick={toggleLike}
                        className={`${styles.secondaryBtn} ${isLiked ? styles.active : ""}`}
                        title={isLiked ? "Unlike" : "Like"}
                        disabled={!currentSong}
                    >
                        <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                    </button>

                    <button
                        onClick={() => setIsPlaylistModalOpen(true)}
                        className={styles.secondaryBtn}
                        title="Add to Playlist"
                        disabled={!currentSong}
                    >
                        <ListPlus size={22} />
                    </button>
                </div>

                {/* Volume Control */}
                <div className={styles.volumeSection}>
                    <Volume2 size={20} />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className={styles.volumeSlider}
                    />
                    <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
                </div>

                {currentSong && (
                    <AddToPlaylistModal
                        isOpen={isPlaylistModalOpen}
                        onClose={() => setIsPlaylistModalOpen(false)}
                        song={currentSong}
                    />
                )}
            </div>
        </div>
    );
}
