"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/playerStore";

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
    const { setCurrentSong, openFullscreen } = usePlayerStore((state) => ({
        setCurrentSong: state.setCurrentSong,
        openFullscreen: state.openFullscreen,
    }));

    useEffect(() => {
        // Load song into the global player
        setCurrentSong({
            videoId: song.videoId,
            title: song.title,
            artist: song.artist,
            thumbnail: song.thumbnail,
            duration: song.duration,
            album: song.album,
        });

        // Wait for session status to be determined
        if (status === "loading") return;

        // If user is not logged in, open fullscreen player as temporary player
        if (!session) {
            const timer = setTimeout(() => {
                openFullscreen();
            }, 300);
            return () => clearTimeout(timer);
        }

        // If logged in, just let the song play normally (no redirect)
    }, [song, setCurrentSong, session, status, openFullscreen]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "2rem",
            textAlign: "center",
        }}>
            <div style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "16px",
                padding: "2rem",
                maxWidth: "500px",
                width: "100%",
            }}>
                <img
                    src={song.thumbnail}
                    alt={song.title}
                    style={{
                        width: "200px",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        marginBottom: "1.5rem",
                    }}
                />
                <h1 style={{
                    fontSize: "1.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "white",
                }}>
                    {song.title}
                </h1>
                <p style={{
                    fontSize: "1.125rem",
                    color: "rgba(255, 255, 255, 0.7)",
                    marginBottom: "1.5rem",
                }}>
                    {song.artist}
                </p>
                <p style={{
                    fontSize: "0.875rem",
                    color: "rgba(255, 255, 255, 0.5)",
                }}>
                    {status === "loading" 
                        ? "Loading..." 
                        : !session 
                        ? "Opening player..." 
                        : "Now playing - Use player controls at the bottom"}
                </p>
            </div>
        </div>
    );
}
