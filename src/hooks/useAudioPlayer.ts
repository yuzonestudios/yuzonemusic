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

        const loadSong = async () => {
            try {
                const response = await fetch(`/api/stream?id=${currentSong.videoId}`);
                const data = await response.json();

                if (data.success && data.data?.url) {
                    audioRef.current!.src = data.data.url;
                    audioRef.current!.load();
                    if (isPlaying) {
                        audioRef.current!.play().catch(console.error);
                    }
                }
            } catch (error) {
                console.error("Failed to load song:", error);
            }
        };

        loadSong();
    }, [currentSong?.videoId]);

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
