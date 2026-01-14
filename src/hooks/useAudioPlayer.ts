"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/store/playerStore";

// Global audio element to ensure only one instance
let globalAudioRef: HTMLAudioElement | null = null;

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

    // Initialize audio element (only once globally)
    useEffect(() => {
        if (!globalAudioRef) {
            globalAudioRef = new Audio();
            globalAudioRef.preload = "metadata";
        }
        audioRef.current = globalAudioRef;

        // Expose globally for components (e.g., fullscreen) to access
        if (typeof window !== "undefined") {
            (window as any).__yuzoneAudio = globalAudioRef;
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
            const target = e.target as HTMLAudioElement;
            const error = target.error;

            console.error("Audio Playback Error:", {
                code: error?.code, // 1: Aborted, 2: Network, 3: Decode, 4: Src Not Supported
                message: error?.message || "Unknown error",
                networkState: target.networkState,
                readyState: target.readyState,
                currentSrc: target.src
            });

            // Prevent infinite error loops
            if (error?.code === 4 && target.src.includes("/api/stream")) {
                console.warn("Stream source not supported or failed to load.");
            }

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

    }, [currentSong?.videoId]); // Only depend on videoId, not isPlaying

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

            // 2. Update audio element - let timeupdate event handle store update
            try {
                audio.currentTime = safeTime;
                // Don't call setCurrentTime here - let the timeupdate event handle it
                // This prevents the race condition where timeupdate fires with old value
            } catch (error) {
                console.error("Seek error:", error);
            }
        }
    }, []);

    return { audioRef, seek };
}
