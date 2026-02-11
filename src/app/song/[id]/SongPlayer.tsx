"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import styles from "./page.module.css";

interface SongPlayerProps {
    videoId: string;
}

export default function SongPlayer({ videoId }: SongPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { openFullscreen, closeFullscreen } = usePlayerStore();

    const isFullscreenFromUrl = searchParams.get("fullscreen") === "true";

    // Sync URL fullscreen state to store on mount
    useEffect(() => {
        if (isFullscreenFromUrl) {
            openFullscreen();
        }
    }, [isFullscreenFromUrl, openFullscreen]);

    const emitSongUrl = useCallback(() => {
        if (typeof window === "undefined") return;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const songUrl = new URL(`/song/${videoId}`, baseUrl).toString();
        (window as any).__yuzoneLastSongUrl = songUrl;
        window.dispatchEvent(
            new CustomEvent("yuzone-song-url", {
                detail: {
                    url: songUrl,
                    videoId,
                },
            })
        );

        fetch("/api/seo/played", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId }),
            keepalive: true,
        }).catch(() => undefined);
    }, [videoId]);

    const togglePlay = useCallback(async () => {
        if (!audioRef.current || isBusy) return;
        setIsBusy(true);

        try {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                await audioRef.current.play();
                setIsPlaying(true);
                emitSongUrl();
            }
        } catch (error) {
            console.error("Song playback error:", error);
            setIsPlaying(false);
        } finally {
            setIsBusy(false);
        }
    }, [isBusy, isPlaying]);

    const handleOpenFullscreen = useCallback(() => {
        openFullscreen();
        // Update URL to reflect fullscreen state without page reload
        router.push(`/song/${videoId}?fullscreen=true`, { scroll: false });
    }, [openFullscreen, router, videoId]);

    return (
        <div className={styles.player}>
            <audio
                ref={audioRef}
                src={`/api/stream?id=${encodeURIComponent(videoId)}`}
                preload="metadata"
                onEnded={() => setIsPlaying(false)}
            />
            <button
                type="button"
                className={styles.playButton}
                onClick={togglePlay}
                aria-pressed={isPlaying}
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
                type="button"
                className={styles.fullscreenButton}
                onClick={handleOpenFullscreen}
                title="Open fullscreen player"
                aria-label="Open fullscreen player"
            >
                ⛶
            </button>
        </div>
    );
}
