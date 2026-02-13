"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/store/playerStore";

// Global audio element to ensure only one instance
let globalAudioRef: HTMLAudioElement | null = null;

export function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timeUpdateBlockedUntilRef = useRef<number>(0);
    const isRestoringRef = useRef<boolean>(false);
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
            // Allow sync hook to block timeupdate temporarily
            (window as any).__yuzoneBlockTimeUpdate = (duration: number) => {
                timeUpdateBlockedUntilRef.current = Date.now() + duration;
            };
            // Allow sync hook to signal restoration in progress
            (window as any).__yuzoneSetRestoring = (value: boolean) => {
                isRestoringRef.current = value;
            };
        }

        const audio = audioRef.current;

        const handleTimeUpdate = () => {
            // Skip update if blocked by restore operation
            if (Date.now() < timeUpdateBlockedUntilRef.current) {
                return;
            }
            // Skip if restoring in progress
            if (isRestoringRef.current) {
                return;
            }
            // Skip 0 updates shortly after song load (first 3 seconds)
            // This prevents overwriting restored time
            const state = usePlayerStore.getState();
            if (audio.currentTime === 0 && state.currentTime > 0 && state.currentTime < 3) {
                return;
            }
            setCurrentTime(audio.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handlePlay = () => {
            usePlayerStore.setState({ isPlaying: true });

            if (typeof window !== "undefined") {
                const { currentSong } = usePlayerStore.getState();
                if (currentSong?.videoId) {
                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                    const songUrl = new URL(`/song/${currentSong.videoId}`, baseUrl).toString();
                    (window as any).__yuzoneLastSongUrl = songUrl;
                    window.dispatchEvent(
                        new CustomEvent("yuzone-song-url", {
                            detail: {
                                url: songUrl,
                                videoId: currentSong.videoId,
                                title: currentSong.title,
                                artist: currentSong.artist,
                            },
                        })
                    );

                    fetch("/api/seo/played", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            videoId: currentSong.videoId,
                            title: currentSong.title,
                            artist: currentSong.artist,
                            thumbnail: currentSong.thumbnail,
                            duration: currentSong.duration,
                        }),
                        keepalive: true,
                    }).catch(() => undefined);
                }
            }
        };

        const handlePause = () => {
            usePlayerStore.setState({ isPlaying: false });
        };

        const handleEnded = () => {
            if (repeat === "one") {
                audio.currentTime = 0;
                audio.play();
            } else {
                nextSong();
            }

            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("yuzone-song-ended"));
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
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("error", handleError);
        };
    }, [setCurrentTime, setDuration, nextSong, pause, repeat]);

    // Load new song with race condition handling
    useEffect(() => {
        if (!audioRef.current || !currentSong) return;

        const audio = audioRef.current;
        const streamUrl = `/api/stream?id=${currentSong.videoId}`;

        // Don't reload if it's the same URL (compare full URL)
        if (audio.src && audio.src.includes(`/api/stream?id=${currentSong.videoId}`)) {
            return;
        }

        const loadAndPlay = async () => {
            try {
                // Signal that we're loading (block timeupdate temporarily)
                isRestoringRef.current = true;
                timeUpdateBlockedUntilRef.current = Date.now() + 3000; // Block for 3 seconds
                
                // Reset to 0 on song change - server sync will restore the correct time
                audio.src = streamUrl;
                audio.load();

                // Server sync (usePlayerSyncServer) will handle time restoration
                // Don't preserve time here to avoid race conditions

                if (isPlaying) {
                    await audio.play();
                }
                
                // Unblock after 1 second (server sync should complete by then)
                setTimeout(() => {
                    isRestoringRef.current = false;
                }, 1000);
            } catch (error: any) {
                // Ignore AbortError which happens when song is skipped quickly
                if (error.name !== 'AbortError') {
                    console.error("Audio playback error:", error);
                }
                isRestoringRef.current = false;
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
