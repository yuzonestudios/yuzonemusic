"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { YTMusicSong } from "@/lib/youtube-music";
import SongCard from "@/components/cards/SongCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function TopSongsPage() {
    const [songs, setSongs] = useState<YTMusicSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTopSongs = async () => {
            try {
                const res = await fetch("/api/top");
                const data = await res.json();

                if (data.success && data.songs) {
                    setSongs(data.songs.slice(0, 20));
                } else {
                    setError("Failed to load top songs");
                }
            } catch (err) {
                console.error("Error fetching top songs:", err);
                setError("Error fetching top songs");
            } finally {
                setLoading(false);
            }
        };

        fetchTopSongs();
    }, []);

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="large" /></div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div>
            <Header title="Top Songs" />
            <div className="p-6 pb-24">
            <h1 className="text-3xl font-bold mb-6 text-white neon-text">Top 20 Songs Today</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {songs.map((song) => (
                    <SongCard key={song.videoId} song={song} />
                ))}
            </div>
        </div>
        </div>
        );
}
