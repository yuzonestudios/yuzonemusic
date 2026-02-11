"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    const { openFullscreen } = usePlayerStore();
    const isValidVideoId = Boolean(videoId && videoId.trim());

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
        if (!isValidVideoId || !audioRef.current || isBusy) return;
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
        try {
            console.log("[SongPlayer] Opening fullscreen for videoId:", videoId);
            if (!isValidVideoId) return;
            openFullscreen();
            // Update URL to reflect fullscreen state without page reload
            const fullUrl = `/song/${videoId}?fullscreen=true`;
            console.log("[SongPlayer] Pushing URL:", fullUrl);
            if (router) {
                router.push(fullUrl, { scroll: false });
            }
        } catch (error) {
            console.error("[SongPlayer] Error opening fullscreen:", error);
        }
    }, [openFullscreen, router, videoId]);

    return (
        <div className={styles.player}>
            <audio
                ref={audioRef}
                src={isValidVideoId ? `/api/stream?id=${encodeURIComponent(videoId)}` : undefined}
                preload="metadata"
                onEnded={() => setIsPlaying(false)}
            />
            <button
                type="button"
                className={styles.playButton}
                onClick={togglePlay}
                aria-pressed={isPlaying}
                disabled={!isValidVideoId}
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
                disabled={!isValidVideoId}
            >
                ⛶
            </button>
        </div>
    );
}
