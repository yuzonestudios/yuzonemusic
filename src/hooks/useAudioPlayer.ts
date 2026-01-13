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
            console.error("Audio error:", e);
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

    // Load new song
    useEffect(() => {
        if (!audioRef.current || !currentSong) return;

        const audio = audioRef.current;

        // Use the API proxy URL directly
        const streamUrl = `/api/stream?id=${currentSong.videoId}`;

        // Only update if different to avoid reloading same song
        if (audio.src !== streamUrl) {
            audio.src = streamUrl;
            audio.load();

            if (isPlaying) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        // Auto-play was prevented or play was aborted
                        if (error.name !== 'AbortError') {
                            console.error("Playback error:", error);
                        }
                    });
                }
            }
        }
    }, [currentSong?.videoId, isPlaying]);

    // Play/pause control
    useEffect(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.play().catch(console.error);
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying]);

    // Volume control
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, [setCurrentTime]);

    return { audioRef, seek };
}
