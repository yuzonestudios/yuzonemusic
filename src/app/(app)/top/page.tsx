"use client";

import { useEffect, useState } from "react";
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
                // We need an API route for this since youtubei.js runs on server
                const response = await fetch("/api/search?q=top100&type=chart");
                // Wait, I didn't create a specific chart endpoint. 
                // I can modify /api/search to handle "type=chart" or create /api/top

                // Let's assume I will create /api/top
                const res = await fetch("/api/top");
                const data = await res.json();

                if (data.success) {
                    setSongs(data.products || data.songs || []);
                } else {
                    setError("Failed to load charts");
                }
            } catch (err) {
                setError("Error fetching charts");
            } finally {
                setLoading(false);
            }
        };

        fetchTopSongs();
    }, []);

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="large" /></div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div className="p-6 pb-24">
            <h1 className="text-3xl font-bold mb-6 text-white neon-text">Top 20 Songs Today</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {songs.map((song) => (
                    <SongCard key={song.videoId} song={song} />
                ))}
            </div>
        </div>
    );
}
