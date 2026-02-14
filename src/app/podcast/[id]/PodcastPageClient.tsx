"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/playerStore";
import ErrorBoundary from "@/components/ErrorBoundary";

interface PodcastPageClientProps {
    id: string;
    feedId: string;
    episodeId: string;
}

export default function PodcastPageClient({ id, feedId, episodeId }: PodcastPageClientProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const currentSong = usePlayerStore((state) => state.currentSong);
    const didRedirectRef = useRef(false);

    useEffect(() => {
        if (status !== "authenticated") return;
        if (!id) return;

        // Check if the current playing item matches this podcast episode
        const isPodcastPlaying = currentSong?.videoId === `podcast-${id}`;

        if (!didRedirectRef.current) {
            didRedirectRef.current = true;
            const redirectTimer = window.setTimeout(() => {
                router.replace("/dashboard");
            }, 500);
            return () => window.clearTimeout(redirectTimer);
        }
    }, [status, id, currentSong?.videoId, router]);

    return (
        <ErrorBoundary>
            {status === "loading" ? (
                <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "white" }}>
                    Loading...
                </div>
            ) : (
                <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "white" }}>
                    {currentSong?.contentType === "podcast" ? (
                        <div>
                            <h1>{currentSong.title}</h1>
                            <p>{currentSong.artist}</p>
                        </div>
                    ) : (
                        <div>Loading podcast episode...</div>
                    )}
                </div>
            )}
        </ErrorBoundary>
    );
}
