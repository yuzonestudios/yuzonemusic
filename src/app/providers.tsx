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
            document.title = `${currentSong.title} - Yuzone Music`;
        } else {
            document.title = "Yuzone Music";
        }
    }, [currentSong?.title, isPlaying]);

    return (
        <SessionProvider>
            <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
    );
}
