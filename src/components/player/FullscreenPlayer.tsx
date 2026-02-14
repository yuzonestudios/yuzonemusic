"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { X, SkipBack, Play, Pause, SkipForward, Volume2, Heart, ListPlus, Download, Share, Music, Shuffle, Repeat, Repeat1 } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { getDownloadName, getPlaybackUrl } from "@/lib/playback";
import { browserCache, BROWSER_CACHE_TTL } from "@/lib/browser-cache";
import styles from "./FullscreenPlayer.module.css";

const AddToPlaylistModal = dynamic(() => import("@/components/ui/AddToPlaylistModal"), { ssr: false });
const ShareModal = dynamic(() => import("@/components/ui/ShareModal"), { ssr: false });
const ArtistModal = dynamic(() => import("@/components/ui/ArtistModal"), { ssr: false });

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
        isFullscreenOpen,
        togglePlay,
        nextSong,
        previousSong,
        setVolume,
        setCurrentTime,
        closeFullscreen,
        queue,
        queueIndex,
        setCurrentSong,
        removeFromQueue,
        clearQueue,
        shuffle,
        repeat,
        toggleShuffle,
        toggleRepeat,
    } = usePlayerStore();

    const [isLiked, setIsLiked] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsError, setLyricsError] = useState<string | null>(null);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [waveIntensity, setWaveIntensity] = useState(0);
    const [isLowPowerMode, setIsLowPowerMode] = useState(false);
    const [ambientColor, setAmbientColor] = useState<string | null>(null);
    const originalUrlRef = useRef<string | null>(null);
    const lyricsBodyRef = useRef<HTMLDivElement | null>(null);
    const isPodcast = currentSong?.contentType === "podcast";
    const playbackUrl = getPlaybackUrl(currentSong);
    const downloadName = getDownloadName(currentSong);

    const parsedLyrics = useMemo(() => {
        if (!lyrics) {
            return { isSynced: false, entries: [], plainLines: [] as string[] };
        }

        const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
        const lines = lyrics.split(/\r?\n/);
        const entries: Array<{ time: number; text: string }> = [];

        for (const line of lines) {
            const matches = [...line.matchAll(timeRegex)];
            if (!matches.length) continue;

            const text = line.replace(timeRegex, "").trim();
            for (const match of matches) {
                const mins = Number.parseInt(match[1], 10);
                const secs = Number.parseInt(match[2], 10);
                const fraction = match[3] ? Number.parseInt(match[3], 10) : 0;
                const divisor = match[3] && match[3].length === 3 ? 1000 : 100;
                const time = mins * 60 + secs + (fraction / divisor);
                if (!Number.isNaN(time)) {
                    entries.push({ time, text });
                }
            }
        }

        entries.sort((a, b) => a.time - b.time);
        const isSynced = entries.length > 0;
        return { isSynced, entries, plainLines: isSynced ? [] : lines };
    }, [lyrics]);

    const activeLyricIndex = useMemo(() => {
        if (!parsedLyrics.isSynced) return -1;
        let idx = -1;
        const current = Math.max(0, currentTime);
        for (let i = 0; i < parsedLyrics.entries.length; i += 1) {
            if (parsedLyrics.entries[i].time <= current + 0.1) {
                idx = i;
            } else {
                break;
            }
        }
        return idx;
    }, [currentTime, parsedLyrics]);

    useEffect(() => {
        if (!parsedLyrics.isSynced || activeLyricIndex < 0) return;
        const container = lyricsBodyRef.current;
        if (!container) return;
        const target = container.querySelector(`[data-lyrics-index="${activeLyricIndex}"]`);
        if (target instanceof HTMLElement) {
            target.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, [activeLyricIndex, parsedLyrics.isSynced]);

    // Extract dominant color from thumbnail
    const extractColorFromImage = async (imageUrl: string) => {
        try {
            const img = new (window as any).Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, 1, 1);
                    const imageData = ctx.getImageData(0, 0, 1, 1);
                    const data = imageData.data;
                    const color = `rgba(${data[0]}, ${data[1]}, ${data[2]}, 0.15)`;
                    setAmbientColor(color);
                }
            };
            img.src = imageUrl;
        } catch (error) {
            console.error("Error extracting color:", error);
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
        const media = window.matchMedia("(max-width: 768px), (prefers-reduced-motion: reduce)");
        const handleChange = () => setIsLowPowerMode(media.matches);
        handleChange();
        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    // Extract color from thumbnail when fullscreen opens
    useEffect(() => {
        if (isFullscreenOpen && currentSong?.thumbnail) {
            extractColorFromImage(currentSong.thumbnail);
        }
    }, [isFullscreenOpen, currentSong?.thumbnail]);

    // Listen for browser back button (popstate) to close fullscreen and sync URL
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handlePopState = () => {
            // Close fullscreen when back button is pressed
            if (isFullscreenOpen) {
                closeFullscreen();
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isFullscreenOpen, closeFullscreen]);

    useEffect(() => {
        if (!isFullscreenOpen) return;

        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isFullscreenOpen]);

    // Cosmetic URL change when fullscreen opens
    useEffect(() => {
        if (typeof window === "undefined") return;

        if (isFullscreenOpen && currentSong?.videoId) {
            // Store original URL before changing
            if (!originalUrlRef.current) {
                originalUrlRef.current = window.location.pathname + window.location.search;
            }
            
            // Push cosmetic URL showing song page
            const songUrl = `/song/${currentSong.videoId}`;
            if (window.location.pathname !== songUrl) {
                window.history.pushState({}, "", songUrl);
            }
        } else if (!isFullscreenOpen && originalUrlRef.current) {
            // Restore original URL when fullscreen closes
            window.history.pushState({}, "", originalUrlRef.current);
            originalUrlRef.current = null;
        }
    }, [isFullscreenOpen, currentSong?.videoId]);

    useEffect(() => {
        if (currentSong) {
            if (currentSong.contentType === "podcast") {
                setIsLiked(false);
                return;
            }
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
        if (!isFullscreenOpen || !currentSong?.videoId || !showLyrics || currentSong.contentType === "podcast") {
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
                    body: JSON.stringify({
                        videoId: currentSong.videoId,
                        trackName: currentSong.title,
                        artistName: currentSong.artist,
                    }),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error(`Lyrics request failed (${res.status})`);
                }

                const data = await res.json();
                if (data?.error) {
                    throw new Error(String(data.error));
                }
                const text = data?.syncedLyrics
                    ? String(data.syncedLyrics)
                    : (data && data.lyrics) ? String(data.lyrics) : "";
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

    const handleCloseFullscreen = (event?: React.MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault();
        event?.stopPropagation();
        closeFullscreen();
    };

    const toggleLike = async () => {
        if (!currentSong || currentSong.contentType === "podcast") return;

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

    const progress = duration ? (currentTime / duration) * 100 : 0;
    const timeLeft = duration ? Math.max(0, duration - currentTime) : 0;

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

    const waveGlow = 6 + (isLowPowerMode ? 0 : waveIntensity * 12);

    const progressStyle: React.CSSProperties = {
        width: `${progress}%`,
                ...(!isLowPowerMode && isPlaying
            ? {
                  ["--progress-glow" as any]: `${waveGlow}px`,
              }
            : {}),
    };

    useEffect(() => {
        if (!isFullscreenOpen || !isPlaying || isLowPowerMode) {
            setWaveIntensity(0);
            return;
        }

        const audio = getAudioElement();
        if (!audio) return;

        let rafId: number;

        const audioCtx: AudioContext = (audio as any).__yuzoneAudioCtx || new AudioContext();
        (audio as any).__yuzoneAudioCtx = audioCtx;

        const analyser: AnalyserNode = (audio as any).__yuzoneAnalyser || audioCtx.createAnalyser();
        analyser.fftSize = 256;
        (audio as any).__yuzoneAnalyser = analyser;

        let source: MediaElementAudioSourceNode | undefined = (audio as any).__yuzoneSource;
        if (!source) {
            source = audioCtx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            (audio as any).__yuzoneSource = source;
        }

        if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => null);
        }

        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) {
                sum += data[i];
            }
            const avg = sum / data.length;
            const normalized = Math.min(1, avg / 255);
            setWaveIntensity(normalized);
            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [isFullscreenOpen, isPlaying, isLowPowerMode]);

    if (!isFullscreenOpen) return null;

    return (
        <div 
            className={styles.overlay}
            style={{
                background: ambientColor 
                    ? `linear-gradient(135deg, ${ambientColor} 0%, rgba(10, 10, 20, 0.98) 60%)`
                    : undefined
            }}
        >
            {currentSong && currentSong.thumbnail && (
                <Image
                    src={currentSong.thumbnail.replace(/=w\d+-h\d+/, '=w1280-h720')}
                    alt=""
                    fill
                    priority
                    className={styles.bgImgEl}
                />
            )}
            <div className={styles.ambientGlow} />
            <div className={styles.ambientGlowAlt} />
            <div className={styles.grain} />
            <div className={styles.container}>
                {/* Close Button */}
                <button onClick={handleCloseFullscreen} className={styles.closeBtn} title="Close">
                    <X size={28} />
                </button>

                {/* Left Column - Player */}
                <div className={styles.leftColumn}>
                    {/* Album Art */}
                    <div className={styles.albumArtContainer}>
                        {currentSong && currentSong.thumbnail ? (
                            <div className={`${styles.albumArt} ${isPlaying ? styles.playingArt : ""}`}>
                                <Image
                                    src={currentSong.thumbnail.replace(/=w\d+-h\d+/, '=w720-h720')}
                                    alt={currentSong.title}
                                    width={720}
                                    height={720}
                                    priority
                                    quality={95}
                                    className={styles.albumImage}
                                />
                                <div className={styles.albumShine} />
                                <div className={styles.albumRings} />
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
                            <div className={styles.badgeRow}>
                                <span className={styles.nowPlayingBadge}>
                                    <span className={styles.pulseDot} /> Now Playing
                                </span>
                                <span className={styles.personalBadge}>Personalized for you</span>
                            </div>
                            <div className={`${styles.equalizer} ${isPlaying ? styles.equalizerPlaying : ""}`}>
                                <span className={styles.eqBar} />
                                <span className={styles.eqBar} />
                                <span className={styles.eqBar} />
                                <span className={styles.eqBar} />
                            </div>
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
                            <div className={styles.metaChips}>
                                <span className={styles.metaChip}>Time left {formatTime(timeLeft)}</span>
                            </div>
                            <div className={styles.metaRow}>
                                <button
                                    className={`${styles.lyricsToggle} ${showLyrics ? styles.active : ""}`}
                                    onClick={() => setShowLyrics((prev) => !prev)}
                                    disabled={!currentSong || isPodcast}
                                >
                                    {showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                                </button>
                                <button
                                    className={`${styles.queueToggle} ${showQueue ? styles.active : ""}`}
                                    onClick={() => setShowQueue((prev) => !prev)}
                                    disabled={!currentSong}
                                    title={queue.length === 0 ? "Queue is empty" : `${Math.max(0, queue.length - queueIndex - 1)} songs in queue`}
                                >
                                    {showQueue ? "Hide Queue" : `Show Queue (${Math.max(0, queue.length - queueIndex - 1)})`}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={styles.controlDock}>
                        {/* Progress Bar */}
                        <div className={styles.progressSection}>
                            <div className={styles.progressBar} onClick={handleProgressClick}>
                                <div className={styles.progressTrack} aria-hidden="true" />
                                <div className={styles.progressFill} style={progressStyle} aria-hidden="true" />
                                <div
                                    className={styles.progressThumb}
                                    style={{ left: `${progress}%` }}
                                    aria-hidden="true"
                                />
                            </div>
                            <div className={styles.timeInfo}>
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className={styles.controlsRow}>
                            <div className={styles.controls}>
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
                            </div>
                        </div>

                        {/* Secondary Controls */}
                        <div className={styles.actionRow}>
                            <div className={styles.secondaryControls}>
                                {!isPodcast && (
                                    <button
                                        onClick={toggleLike}
                                        className={`${styles.secondaryBtn} ${isLiked ? styles.active : ""}`}
                                        title={isLiked ? "Unlike" : "Like"}
                                        disabled={!currentSong}
                                    >
                                        <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                                    </button>
                                )}

                                {!isPodcast && (
                                    <button
                                        onClick={() => setIsPlaylistModalOpen(true)}
                                        className={styles.secondaryBtn}
                                        title="Add to Playlist"
                                        disabled={!currentSong}
                                    >
                                        <ListPlus size={22} />
                                    </button>
                                )}

                                {!isPodcast && (
                                    <button
                                        onClick={() => setIsShareModalOpen(true)}
                                        className={styles.secondaryBtn}
                                        title="Share"
                                        disabled={!currentSong}
                                    >
                                        <Share size={22} />
                                    </button>
                                )}

                                <a
                                    href={playbackUrl || "#"}
                                    download={downloadName}
                                    className={styles.secondaryBtn}
                                    title="Download"
                                >
                                    <Download size={22} />
                                </a>
                            </div>
                        </div>

                        <div className={styles.utilityRow}>
                            {/* Shuffle & Repeat */}
                            <div className={styles.playbackModes}>
                                <button
                                    onClick={toggleShuffle}
                                    className={`${styles.modeBtn} ${shuffle ? styles.active : ""}`}
                                    title={shuffle ? "Shuffle on" : "Shuffle off"}
                                    disabled={!currentSong}
                                >
                                    <Shuffle size={20} />
                                </button>
                                <button
                                    onClick={toggleRepeat}
                                    className={`${styles.modeBtn} ${repeat !== "off" ? styles.active : ""}`}
                                    title={
                                        repeat === "off" ? "Repeat off" :
                                        repeat === "all" ? "Repeat all" : "Repeat one"
                                    }
                                    disabled={!currentSong}
                                >
                                    {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
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
                        </div>
                    </div>
                </div>

                {/* Right Column - Lyrics/Queue */}
                <div className={styles.rightColumn}>
                    {/* Lyrics */}
                    {currentSong && showLyrics && !showQueue && !isPodcast && (
                        <div className={styles.lyricsPanel}>
                            <div className={styles.lyricsHeader}>
                                <span className={styles.lyricsTitle}>
                                    Lyrics
                                    {parsedLyrics.isSynced && (
                                        <span className={styles.lyricsBadge}>Synced</span>
                                    )}
                                </span>
                                {lyricsLoading && <span className={styles.lyricsStatus}>Loading…</span>}
                                {lyricsError && !lyricsLoading && (
                                    <span className={styles.lyricsError}>{lyricsError}</span>
                                )}
                            </div>
                            <div className={styles.lyricsBody} ref={lyricsBodyRef}>
                                {lyricsLoading && <span className={styles.lyricsStatus}>Fetching lyrics…</span>}
                                {!lyricsLoading && parsedLyrics.isSynced && parsedLyrics.entries.map((line, idx) => (
                                    <p
                                        key={`${line.time}-${idx}`}
                                        data-lyrics-index={idx}
                                        className={`${styles.lyricsLine} ${idx === activeLyricIndex ? styles.lyricsLineActive : ""}`}
                                    >
                                        {line.text || "\u00a0"}
                                    </p>
                                ))}
                                {!lyricsLoading && !parsedLyrics.isSynced && parsedLyrics.plainLines.map((line, idx) => (
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

                    {/* Queue */}
                    {currentSong && showQueue && (
                        <div className={styles.queuePanel}>
                            <div className={styles.queueHeader}>
                                <span className={styles.queueTitle}>
                                    Queue
                                    <span className={styles.queueCountBadge}>{Math.max(0, queue.length - queueIndex - 1)}</span>
                                </span>
                                {queue.length > 0 && (
                                    <button
                                        type="button"
                                        className={styles.queueClearBtn}
                                        onClick={() => clearQueue()}
                                        title="Clear queue"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className={styles.queueBody}>
                                {queue.length === 0 && (
                                    <span className={styles.queueEmpty}>Queue is empty</span>
                                )}
                                {queue.length > 0 && (
                                    <>
                                        {queueIndex < queue.length - 1 ? (
                                            queue.slice(queueIndex + 1).map((song, idx) => (
                                                <div
                                                    key={`${song.videoId}-${queueIndex + idx + 1}`}
                                                    className={styles.queueItem}
                                                    onClick={() => setCurrentSong(song)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            setCurrentSong(song);
                                                        }
                                                    }}
                                                >
                                                    <div className={styles.queueItemContent}>
                                                        <span className={styles.queueItemNumber}>{idx + 1}</span>
                                                        <div className={styles.queueItemInfo}>
                                                            <p className={styles.queueItemTitle}>{song.title}</p>
                                                            <p className={styles.queueItemArtist}>{song.artist}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromQueue(queueIndex + idx + 1);
                                                        }}
                                                        className={styles.queueRemoveBtn}
                                                        title="Remove from queue"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <span className={styles.queueEmpty}>No more songs in queue</span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {currentSong && !isPodcast && (
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
