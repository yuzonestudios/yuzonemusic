"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";

export function useKeyboardShortcuts() {
    const { currentSong, togglePlay, nextSong, previousSong, setVolume, volume } = usePlayerStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    if (currentSong) {
                        togglePlay();
                    }
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    nextSong();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    previousSong();
                    break;
                case "ArrowUp":
                    if (e.shiftKey) {
                        e.preventDefault();
                        setVolume(Math.min(1, volume + 0.1));
                    }
                    break;
                case "ArrowDown":
                    if (e.shiftKey) {
                        e.preventDefault();
                        setVolume(Math.max(0, volume - 0.1));
                    }
                    break;
                case "KeyM":
                    e.preventDefault();
                    setVolume(volume > 0 ? 0 : 0.7);
                    break;
                case "KeyN":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        nextSong();
                    }
                    break;
                case "KeyP":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        previousSong();
                    }
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [currentSong, togglePlay, nextSong, previousSong, setVolume, volume]);

    // Handle media keys (headphone controls)
    useEffect(() => {
        const handleMediaControl = (details: any) => {
            if (details.action === "play" || details.action === "play-pause") {
                togglePlay();
            } else if (details.action === "nexttrack") {
                nextSong();
            } else if (details.action === "previoustrack") {
                previousSong();
            }
        };

        // Use MediaSession API if available (most modern browsers)
        if (navigator.mediaSession) {
            navigator.mediaSession.setActionHandler("play", () => {
                if (currentSong) togglePlay();
            });
            navigator.mediaSession.setActionHandler("pause", () => {
                togglePlay();
            });
            navigator.mediaSession.setActionHandler("nexttrack", () => {
                nextSong();
            });
            navigator.mediaSession.setActionHandler("previoustrack", () => {
                previousSong();
            });
        }

        return () => {
            // Clean up media session handlers
            if (navigator.mediaSession) {
                navigator.mediaSession.setActionHandler("play", null);
                navigator.mediaSession.setActionHandler("pause", null);
                navigator.mediaSession.setActionHandler("nexttrack", null);
                navigator.mediaSession.setActionHandler("previoustrack", null);
            }
        };
    }, [currentSong, togglePlay, nextSong, previousSong]);
}
