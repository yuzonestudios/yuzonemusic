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
                    if (e.shiftKey) {
                        e.preventDefault();
                        nextSong();
                    }
                    break;
                case "ArrowLeft":
                    if (e.shiftKey) {
                        e.preventDefault();
                        previousSong();
                    }
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
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [currentSong, togglePlay, nextSong, previousSong, setVolume, volume]);
}
