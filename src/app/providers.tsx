"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeContext";
import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientErrorReporter from "@/components/ClientErrorReporter";

export default function Providers({ children }: { children: React.ReactNode }) {
    const { currentSong, isPlaying } = usePlayerStore();

    // Update document title - keep song title even when paused
    useEffect(() => {
        if (typeof document === "undefined") return;
        if (currentSong?.title) {
            const artist = currentSong.artist || "Unknown Artist";
            document.title = `${currentSong.title} - ${artist} | Yuzone Music`;
        } else {
            document.title = "Yuzone Music";
        }
    }, [currentSong?.title, currentSong?.artist]);

    // Update Media Session metadata for home screen icon and media controls
    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.mediaSession) return;
        
        if (currentSong) {
            const artist = currentSong.artist || "Unknown Artist";
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.title,
                artist: artist,
                album: currentSong.album || "Yuzone Music",
                artwork: [
                    { src: currentSong.thumbnail, sizes: "96x96", type: "image/jpeg" },
                    { src: currentSong.thumbnail, sizes: "128x128", type: "image/jpeg" },
                    { src: currentSong.thumbnail, sizes: "192x192", type: "image/jpeg" },
                    { src: currentSong.thumbnail, sizes: "256x256", type: "image/jpeg" },
                    { src: currentSong.thumbnail, sizes: "384x384", type: "image/jpeg" },
                    { src: currentSong.thumbnail, sizes: "512x512", type: "image/jpeg" },
                ]
            });
        } else {
            navigator.mediaSession.metadata = null;
        }
    }, [currentSong]);

    return (
        <ErrorBoundary>
            <ClientErrorReporter />
            <SessionProvider>
                <ThemeProvider>{children}</ThemeProvider>
            </SessionProvider>
        </ErrorBoundary>
    );
}
