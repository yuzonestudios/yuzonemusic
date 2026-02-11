"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
    const router = useRouter();
    const setCurrentSong = usePlayerStore((state) => state.setCurrentSong);

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

        // Redirect to dashboard where the normal player UI exists
        const timer = setTimeout(() => {
            router.push("/dashboard");
        }, 500);

        return () => clearTimeout(timer);
    }, [song, setCurrentSong, router]);

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
                    Loading player...
                </p>
            </div>
        </div>
    );
}
