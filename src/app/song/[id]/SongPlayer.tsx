"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./page.module.css";

interface SongPlayerProps {
    song: {
        videoId: string;
        title: string;
        artist: string;
        thumbnail: string;
        duration: string;
    };
}

function formatTime(seconds: number) {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SongPlayer({ song }: SongPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const isValidVideoId = Boolean(song.videoId && song.videoId.trim());

    const streamSrc = useMemo(
        () =>
            isValidVideoId
                ? `/api/stream?id=${encodeURIComponent(song.videoId)}`
                : undefined,
        [isValidVideoId, song.videoId]
    );

    const emitSongUrl = useCallback(() => {
        if (typeof window === "undefined") return;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const songUrl = new URL(`/song/${song.videoId}`, baseUrl).toString();
        (window as any).__yuzoneLastSongUrl = songUrl;
        window.dispatchEvent(
            new CustomEvent("yuzone-song-url", {
                detail: {
                    url: songUrl,
                    videoId: song.videoId,
                    title: song.title,
                    artist: song.artist,
                },
            })
        );

        fetch("/api/seo/played", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                videoId: song.videoId,
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail,
                duration: song.duration,
            }),
            keepalive: true,
        }).catch(() => undefined);
    }, [song.artist, song.duration, song.thumbnail, song.title, song.videoId]);

    const togglePlay = useCallback(async () => {
        if (!isValidVideoId || !audioRef.current || isBusy || !isAudioReady) return;
        setIsBusy(true);

        try {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                await audioRef.current.play();
                setIsPlaying(true);
                emitSongUrl();
            }
        } catch (error) {
            console.error("Song playback error:", error);
            setIsPlaying(false);
        } finally {
            setIsBusy(false);
        }
    }, [emitSongUrl, isBusy, isPlaying, isValidVideoId]);

    const handleProgressChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const nextTime = Number.parseFloat(event.target.value);
        if (!audioRef.current || Number.isNaN(nextTime)) return;
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
    }, []);

    return (
        <div className={styles.guestFullscreen}>
            <div className={styles.guestBackdrop} aria-hidden="true">
                <img src={song.thumbnail} alt="" />
            </div>
            <div className={styles.guestBackdropOverlay} aria-hidden="true" />
            <div className={styles.guestPanel}>
                <div className={styles.guestArtWrap}>
                    <img src={song.thumbnail} alt={song.title} className={styles.guestArt} />
                </div>
                <div className={styles.guestInfo}>
                    <span className={styles.guestNowPlaying}>Now Playing</span>
                    <h1 className={styles.guestTitle}>{song.title}</h1>
                    <p className={styles.guestArtist}>{song.artist}</p>
                </div>

                <div className={styles.guestControls}>
                    <button
                        type="button"
                        className={styles.guestPlayButton}
                        onClick={togglePlay}
                        aria-pressed={isPlaying}
                        disabled={!isValidVideoId || isBusy || !isAudioReady}
                    >
                        {isPlaying ? <Pause size={30} /> : <Play size={30} fill="currentColor" />}
                    </button>

                    <div className={styles.guestProgressWrap}>
                        <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            value={Math.min(currentTime, duration || 0)}
                            onChange={handleProgressChange}
                            className={styles.guestProgress}
                            aria-label="Seek"
                        />
                        <div className={styles.guestTimes}>
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
                {!isAudioReady && (
                    <p className={styles.guestLoading}>Loading player...</p>
                )}
            </div>

            <audio
                ref={audioRef}
                src={streamSrc}
                preload="metadata"
                onLoadStart={() => setIsAudioReady(false)}
                onTimeUpdate={() => {
                    if (!audioRef.current) return;
                    setCurrentTime(audioRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                    if (!audioRef.current) return;
                    setDuration(audioRef.current.duration || 0);
                    setIsAudioReady(true);
                }}
                onCanPlay={() => setIsAudioReady(true)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onEnded={() => setIsPlaying(false)}
            />
        </div>
    );
}
