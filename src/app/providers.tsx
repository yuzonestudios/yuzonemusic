"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeContext";
import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";

export default function Providers({ children }: { children: React.ReactNode }) {
    const { currentSong, isPlaying } = usePlayerStore();

    useEffect(() => {
        if (typeof document === "undefined") return;
        if (isPlaying && currentSong?.title) {
            const artist = currentSong.artist || "Unknown Artist";
            document.title = `${currentSong.title} - ${artist} | Yuzone Music`;
        } else {
            document.title = "Yuzone Music";
        }
    }, [currentSong?.title, currentSong?.artist, isPlaying]);

    return (
        <SessionProvider>
            <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
    );
}
