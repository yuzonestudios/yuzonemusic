"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/store/playerStore";

export function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const {
        currentSong,
        isPlaying,
        volume,
        currentTime,
        setCurrentTime,
        setDuration,
        nextSong,
        pause,
        repeat,
    } = usePlayerStore();

    // Initialize audio element
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.preload = "metadata";
        }

        const audio = audioRef.current;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            if (repeat === "one") {
                audio.currentTime = 0;
                audio.play();
            } else {
                nextSong();
            }
        };

        const handleError = (e: Event) => {
            const error = audioRef.current?.error;
            console.error("Audio error details:", {
                code: error?.code,
                message: error?.message,
                networkState: audioRef.current?.networkState,
                src: audioRef.current?.src,
                eventType: e.type
            });
            pause();
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("error", handleError);
        };
    }, [setCurrentTime, setDuration, nextSong, pause, repeat]);

    // Load new song with race condition handling
    useEffect(() => {
        if (!audioRef.current || !currentSong) return;

        const audio = audioRef.current;
        const streamUrl = `/api/stream?id=${currentSong.videoId}`;

        // Reset state for new song
        // Don't reload if it's the same URL
        if (audio.src === streamUrl) {
            // Just ensure it's playing if meant to be
            if (isPlaying && audio.paused) {
                audio.play().catch(e => {
                    if (e.name !== 'AbortError') console.error("Resume play failed:", e);
                });
            }
            return;
        }

        const loadAndPlay = async () => {
            try {
                audio.src = streamUrl;
                audio.load();

                if (isPlaying) {
                    await audio.play();
                }
            } catch (error: any) {
                // Ignore AbortError which happens when song is skipped quickly
                if (error.name !== 'AbortError') {
                    console.error("Audio playback error:", error);
                }
            }
        };

        loadAndPlay();

    }, [currentSong?.videoId, isPlaying]); // Only depend on videoId ref, not full object

    // Play/Pause toggle effect
    useEffect(() => {
        if (!audioRef.current || !currentSong) return;
        const audio = audioRef.current;

        if (isPlaying && audio.paused) {
            audio.play().catch(e => {
                if (e.name !== 'AbortError') console.error("Play toggle error:", e);
            });
        } else if (!isPlaying && !audio.paused) {
            audio.pause();
        }
    }, [isPlaying, currentSong]);

    // Volume control
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, volume)); // Clamp volume
        }
    }, [volume]);

    // Enhanced Seek Function
    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            const audio = audioRef.current;

            // 1. Valid range check
            const duration = isFinite(audio.duration) ? audio.duration : 0;
            if (duration === 0) {
                console.warn("Seek ignored: Audio duration not ready");
                return;
            }

            const safeTime = Math.min(Math.max(0, time), duration);

            // 2. Check seekable ranges
            // Some browsers/proxies report empty seekable ranges for streamed content initially
            const ranges = audio.seekable;
            if (ranges.length > 0) {
                audio.currentTime = safeTime;
            } else {
                // Try anyway - mostly for development/legacy compatibility
                console.warn("Stream might not support seeking yet. Attempting strict seek to", safeTime);
                audio.currentTime = safeTime;
            }

            // 3. Update UI immediately
            setCurrentTime(safeTime);
        }
    }, [setCurrentTime]);

    return { audioRef, seek };
}
