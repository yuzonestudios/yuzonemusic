"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/playerStore";
import ErrorBoundary from "@/components/ErrorBoundary";
import SongPlayer from "./SongPlayer";

interface SongPageClientProps {
    song: {
        videoId: string;
        title: string;
        artist: string;
        thumbnail: string;
        duration: string;
        album?: string;
    };
}

export default function SongPageClient({ song }: SongPageClientProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const setCurrentSong = usePlayerStore((state) => state.setCurrentSong);
    const currentVideoId = usePlayerStore((state) => state.currentSong?.videoId || null);
    const lastSongSignatureRef = useRef<string | null>(null);
    const didRedirectRef = useRef(false);

    useEffect(() => {
        if (status !== "authenticated") return;
        if (!song.videoId) return;

        const signature = [
            song.videoId,
            song.title,
            song.artist,
            song.thumbnail,
            song.duration,
            song.album ?? "",
        ].join("|");

        if (lastSongSignatureRef.current !== signature && currentVideoId !== song.videoId) {
            lastSongSignatureRef.current = signature;

            // Load song into the global player once per song change
            setCurrentSong({
                videoId: song.videoId,
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail,
                duration: song.duration,
                album: song.album,
            });
        }

        if (!didRedirectRef.current) {
            didRedirectRef.current = true;
            const redirectTimer = window.setTimeout(() => {
                router.replace("/dashboard");
            }, 500);
            return () => window.clearTimeout(redirectTimer);
        }
    }, [
        status,
        song.videoId,
        song.title,
        song.artist,
        song.thumbnail,
        song.duration,
        song.album,
        setCurrentSong,
        currentVideoId,
        router,
    ]);

    return (
        <ErrorBoundary>
            {status === "loading" ? (
                <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "white" }}>
                    Loading...
                </div>
            ) : !session ? (
                <SongPlayer song={song} />
            ) : (
                <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "white" }}>
                    Redirecting to player...
                </div>
            )}
        </ErrorBoundary>
    );
}
