"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, SkipBack, Play, Pause, SkipForward, Volume2, Repeat, Shuffle, Heart, ListPlus, Download, Share } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import AddToPlaylistModal from "@/components/ui/AddToPlaylistModal";
import ShareModal from "@/components/ui/ShareModal";
import ArtistModal from "@/components/ui/ArtistModal";
import { browserCache, BROWSER_CACHE_TTL } from "@/lib/browser-cache";
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
        playbackSpeed,
        togglePlay,
        nextSong,
        previousSong,
        setVolume,
        setCurrentTime,
        toggleRepeat,
        toggleShuffle,
        closeFullscreen,
        setPlaybackSpeed,
    } = usePlayerStore();

    const [isLiked, setIsLiked] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsError, setLyricsError] = useState<string | null>(null);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

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

    // Fetch lyrics when fullscreen is open and song changes
    useEffect(() => {
        if (!isFullscreenOpen || !currentSong?.videoId || !showLyrics) {
            return;
        }

        const controller = new AbortController();
        const loadLyrics = async () => {
            setLyricsLoading(true);
            setLyricsError(null);

            // Check browser cache first
            const cacheKey = `lyrics:${currentSong.videoId}`;
            const cachedLyrics = browserCache.get<string>(cacheKey);
            if (cachedLyrics) {
                setLyrics(cachedLyrics);
                setLyricsLoading(false);
                return;
            }

            try {
                const res = await fetch("/api/lyrics", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ videoId: currentSong.videoId }),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error(`Lyrics request failed (${res.status})`);
                }

                const data = await res.json();
                const text = (data && data.lyrics) ? String(data.lyrics) : "";
                const lyricsText = text.trim() || null;
                
                setLyrics(lyricsText);
                
                // Cache the lyrics if we got them
                if (lyricsText) {
                    browserCache.set(cacheKey, lyricsText, BROWSER_CACHE_TTL.LYRICS);
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error("Failed to fetch lyrics", error);
                setLyrics(null);
                setLyricsError("Lyrics unavailable for this track.");
            } finally {
                if (!controller.signal.aborted) {
                    setLyricsLoading(false);
                }
            }
        };

        loadLyrics();

        return () => controller.abort();
    }, [isFullscreenOpen, currentSong?.videoId, showLyrics]);

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
                                src={currentSong.thumbnail.replace(/=w\d+-h\d+/, '=w720-h720')}
                                alt={currentSong.title}
                                width={720}
                                height={720}
                                priority
                                quality={95}
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
                        <p 
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
                            {currentSong.artist}
                        </p>
                        <div className={styles.metaRow}>
                            <button
                                className={`${styles.lyricsToggle} ${showLyrics ? styles.active : ""}`}
                                onClick={() => setShowLyrics((prev) => !prev)}
                                disabled={!currentSong}
                            >
                                {showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Lyrics */}
                {currentSong && showLyrics && (
                    <div className={styles.lyricsPanel}>
                        <div className={styles.lyricsHeader}>
                            <span>Lyrics</span>
                            {lyricsLoading && <span className={styles.lyricsStatus}>Loading…</span>}
                            {lyricsError && !lyricsLoading && (
                                <span className={styles.lyricsError}>{lyricsError}</span>
                            )}
                        </div>
                        <div className={styles.lyricsBody}>
                            {lyricsLoading && <span className={styles.lyricsStatus}>Fetching lyrics…</span>}
                            {!lyricsLoading && lyrics && lyrics.split(/\r?\n/).map((line, idx) => (
                                <p key={idx} className={styles.lyricsLine}>{line || "\u00a0"}</p>
                            ))}
                            {!lyricsLoading && !lyrics && !lyricsError && (
                                <span className={styles.lyricsStatus}>Lyrics not available.</span>
                            )}
                            {!lyricsLoading && lyricsError && (
                                <span className={styles.lyricsStatus}>{lyricsError}</span>
                            )}
                        </div>
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

                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className={styles.secondaryBtn}
                        title="Share"
                        disabled={!currentSong}
                    >
                        <Share size={22} />
                    </button>

                    <a
                        href={currentSong ? `/api/stream?id=${currentSong.videoId}` : "#"}
                        download={currentSong ? `${currentSong.title}.mp3` : undefined}
                        className={styles.secondaryBtn}
                        title="Download"
                    >
                        <Download size={22} />
                    </a>
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

                {/* Playback Speed Control */}
                <div className={styles.speedSection}>
                    <button 
                        className={styles.speedBtn}
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        title="Playback Speed"
                    >
                        {playbackSpeed}x
                    </button>
                    {showSpeedMenu && (
                        <div className={styles.speedMenu}>
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                <button
                                    key={speed}
                                    className={`${styles.speedOption} ${playbackSpeed === speed ? styles.active : ''}`}
                                    onClick={() => {
                                        setPlaybackSpeed(speed);
                                        setShowSpeedMenu(false);
                                    }}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {currentSong && (
                    <>
                        <AddToPlaylistModal
                            isOpen={isPlaylistModalOpen}
                            onClose={() => setIsPlaylistModalOpen(false)}
                            song={currentSong}
                        />
                        <ArtistModal
                            isOpen={isArtistModalOpen}
                            artistName={currentSong.artist}
                            onClose={() => setIsArtistModalOpen(false)}
                        />
                    </>
                )}

                {currentSong && isShareModalOpen && (
                    <ShareModal
                        contentType="song"
                        contentId={currentSong.videoId}
                        contentName={currentSong.title}
                        onClose={() => setIsShareModalOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}
