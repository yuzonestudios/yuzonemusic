import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import PlaybackHistory from "@/models/PlaybackHistory";
import LikedSong from "@/models/LikedSong";

interface ScoredSong {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    score: number;
    reason: string;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Fetch user's playback history (last 100 plays)
        const history = await PlaybackHistory.find({ userId: user._id })
            .sort({ playedAt: -1 })
            .limit(100)
            .lean();

        // Fetch user's liked songs
        const likedSongs = await LikedSong.find({ userId: user._id })
            .sort({ likedAt: -1 })
            .limit(50)
            .lean();

        // Fetch trending songs
        let trendingSongs: any[] = [];
        try {
            const trendingRes = await fetch(`${req.nextUrl.origin}/api/top`);
            if (trendingRes.ok) {
                const trendingData = await trendingRes.json();
                if (trendingData.success && trendingData.songs) {
                    trendingSongs = trendingData.songs.slice(0, 30);
                }
            }
        } catch (error) {
            console.error("Failed to fetch trending songs:", error);
        }

        // Extract recently played song IDs to avoid repetition
        const recentlyPlayedIds = new Set(
            history.slice(0, 30).map((h: any) => h.videoId)
        );

        // Build artist frequency map from history and likes
        const artistFrequency = new Map<string, number>();
        [...history, ...likedSongs].forEach((song: any) => {
            const artist = song.artist || "Unknown";
            artistFrequency.set(artist, (artistFrequency.get(artist) || 0) + 1);
        });

        // Get top artists
        const topArtists = Array.from(artistFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([artist]) => artist);

        // Collect recommendations from multiple sources
        const recommendations: ScoredSong[] = [];
        const seenVideoIds = new Set<string>();

        // 1. Based on Recently Played (40% weight)
        const recentSongs = history.slice(0, 20);
        for (const song of recentSongs) {
            if (recentlyPlayedIds.has(song.videoId)) continue;

            // Search for similar songs using external API
            try {
                const searchQuery = `${song.artist} ${song.title}`.substring(0, 50);
                const searchRes = await fetch(
                    `https://api.yuzone.me/search?q=${encodeURIComponent(searchQuery)}`
                );
                
                if (searchRes.ok) {
                    const results = await searchRes.json();
                    for (const result of results.slice(0, 3)) {
                        if (
                            !recentlyPlayedIds.has(result.videoId) &&
                            !seenVideoIds.has(result.videoId) &&
                            result.videoId !== song.videoId
                        ) {
                            recommendations.push({
                                videoId: result.videoId,
                                title: result.title || "Unknown Title",
                                artist: Array.isArray(result.artists)
                                    ? result.artists.join(", ")
                                    : result.artist || result.artists || "Unknown Artist",
                                thumbnail: result.thumbnail || result.thumbnails?.[0]?.url || "/placeholder-album.png",
                                duration: result.duration || "",
                                score: 0.4,
                                reason: `Because you played ${song.title}`,
                            });
                            seenVideoIds.add(result.videoId);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch similar songs:", error);
            }
        }

        // 2. Based on Liked Songs (30% weight)
        for (const liked of likedSongs.slice(0, 10)) {
            try {
                const searchQuery = `${liked.artist}`.substring(0, 30);
                const searchRes = await fetch(
                    `https://api.yuzone.me/search?q=${encodeURIComponent(searchQuery)}`
                );
                
                if (searchRes.ok) {
                    const results = await searchRes.json();
                    for (const result of results.slice(0, 2)) {
                        if (
                            !recentlyPlayedIds.has(result.videoId) &&
                            !seenVideoIds.has(result.videoId)
                        ) {
                            recommendations.push({
                                videoId: result.videoId,
                                title: result.title || "Unknown Title",
                                artist: Array.isArray(result.artists)
                                    ? result.artists.join(", ")
                                    : result.artist || result.artists || "Unknown Artist",
                                thumbnail: result.thumbnail || result.thumbnails?.[0]?.url || "/placeholder-album.png",
                                duration: result.duration || "",
                                score: 0.3,
                                reason: `More from ${liked.artist}`,
                            });
                            seenVideoIds.add(result.videoId);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch artist songs:", error);
            }
        }

        // 3. Trending in Your Style (20% weight)
        for (const trending of trendingSongs) {
            const trendingArtist = Array.isArray(trending.artists)
                ? trending.artists.join(", ")
                : trending.artist || trending.artists || "";
            
            if (
                topArtists.some(artist => 
                    trendingArtist.toLowerCase().includes(artist.toLowerCase())
                ) &&
                !recentlyPlayedIds.has(trending.videoId) &&
                !seenVideoIds.has(trending.videoId)
            ) {
                recommendations.push({
                    videoId: trending.videoId,
                    title: trending.title || "Unknown Title",
                    artist: trendingArtist || "Unknown Artist",
                    thumbnail: trending.thumbnail || "/placeholder-album.png",
                    duration: trending.duration || "",
                    score: 0.2,
                    reason: "Trending in your style",
                });
                seenVideoIds.add(trending.videoId);
            }
        }

        // 4. Discovery (10% weight) - Random trending songs
        for (const trending of trendingSongs.slice(10, 25)) {
            if (
                !recentlyPlayedIds.has(trending.videoId) &&
                !seenVideoIds.has(trending.videoId)
            ) {
                recommendations.push({
                    videoId: trending.videoId,
                    title: trending.title || "Unknown Title",
                    artist: Array.isArray(trending.artists)
                        ? trending.artists.join(", ")
                        : trending.artist || trending.artists || "Unknown Artist",
                    thumbnail: trending.thumbnail || "/placeholder-album.png",
                    duration: trending.duration || "",
                    score: 0.1,
                    reason: "Discovery",
                });
                seenVideoIds.add(trending.videoId);
                
                if (seenVideoIds.size > 50) break;
            }
        }

        // Sort by score and return top recommendations
        const sortedRecommendations = recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 60);

        // Group by reason
        const groupedRecommendations = {
            basedOnRecent: sortedRecommendations.filter(r => r.reason.includes("Because you played")).slice(0, 15),
            moreFromArtists: sortedRecommendations.filter(r => r.reason.includes("More from")).slice(0, 15),
            trendingInYourStyle: sortedRecommendations.filter(r => r.reason === "Trending in your style").slice(0, 15),
            discovery: sortedRecommendations.filter(r => r.reason === "Discovery").slice(0, 15),
        };

        return NextResponse.json({
            success: true,
            recommendations: groupedRecommendations,
            topArtists: topArtists.slice(0, 5),
        });

    } catch (error) {
        console.error("Error generating recommendations:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate recommendations" },
            { status: 500 }
        );
    }
}
