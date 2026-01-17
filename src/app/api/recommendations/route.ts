import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import PlaybackHistory from "@/models/PlaybackHistory";
import LikedSong from "@/models/LikedSong";
import { generateAIRecommendations, analyzeUserMusicTaste } from "@/lib/gemini";

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
                    trendingSongs = trendingData.songs.slice(0, 50);
                    console.log(`✅ Fetched ${trendingSongs.length} trending songs`);
                }
            } else {
                console.error("❌ Failed to fetch trending songs - API returned error");
            }
        } catch (error) {
            console.error("❌ Failed to fetch trending songs:", error);
        }

        console.log(`📊 User stats - History: ${history.length}, Liked: ${likedSongs.length}, Trending (initial): ${trendingSongs.length}`);

        // Extract recently played song IDs to avoid repetition
        const recentlyPlayedIds = new Set(
            history.slice(0, 30).map((h: any) => h.videoId)
        );

        // Build artist frequency map from history and likes with recency decay for better signal
        const artistFrequency = new Map<string, number>();
        const decay = (idx: number) => Math.exp(-idx / 25); // softer tail for diversity

        history.forEach((song: any, idx: number) => {
            const artist = song.artist || "Unknown";
            artistFrequency.set(artist, (artistFrequency.get(artist) || 0) + decay(idx));
        });

        likedSongs.forEach((song: any, idx: number) => {
            const artist = song.artist || "Unknown";
            // likes get slightly higher weight
            artistFrequency.set(artist, (artistFrequency.get(artist) || 0) + 1.2 * decay(idx));
        });

        // Get top artists
        const topArtists = Array.from(artistFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([artist]) => artist);

        // If no trending songs, try to search for songs from top artists
        if (trendingSongs.length === 0 && topArtists.length > 0) {
            console.log("⚠️ No trending songs - searching for songs from top artists...");
            try {
                const topArtist = topArtists[0];
                const artistSearch = await fetch(
                    `https://api.yuzone.me/search?q=${encodeURIComponent(topArtist)}`
                );
                if (artistSearch.ok) {
                    const searchData = await artistSearch.json();
                    if (Array.isArray(searchData) && searchData.length > 0) {
                        trendingSongs = searchData.slice(0, 50);
                        console.log(`✅ Found ${trendingSongs.length} songs from top artist: ${topArtist}`);
                    }
                }
            } catch (error) {
                console.error("Failed to search for top artist songs:", error);
            }
        }

        // Extract genres from listening history (basic inference)
        const genreKeywords = new Map<string, number>();
        const extractGenreHints = (title: string, artist: string) => {
            const text = `${title} ${artist}`.toLowerCase();
            const genres = ["rock", "pop", "jazz", "classical", "electronic", "hip hop", "rap", "indie", "folk", "metal", "r&b", "soul", "country", "blues"];
            genres.forEach(genre => {
                if (text.includes(genre)) {
                    genreKeywords.set(genre, (genreKeywords.get(genre) || 0) + 1);
                }
            });
        };

        history.forEach((song: any) => extractGenreHints(song.title, song.artist));
        likedSongs.forEach((song: any) => extractGenreHints(song.title, song.artist));

        const topGenres = Array.from(genreKeywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre]) => genre);

        // Helper: pick best available thumbnail url
        const pickBestThumb = (item: any): string => {
            const thumbs: Array<{ url: string; width?: number; height?: number }> = item?.thumbnails || item?.thumbnail?.contents || [];
            if (Array.isArray(thumbs) && thumbs.length > 0) {
                // Prefer largest by width/height, fallback to last
                const sorted = thumbs
                    .map(t => ({ url: t.url, width: t.width ?? 0, height: t.height ?? 0 }))
                    .sort((a, b) => (b.width * b.height) - (a.width * a.height));
                const url = (sorted[0]?.url || thumbs[thumbs.length - 1]?.url) || "";
                if (!url) return "/placeholder-album.png";
                return url.startsWith("//") ? `https:${url}` : url;
            }
            return item?.thumbnail || "/placeholder-album.png";
        };

        // Collect recommendations from multiple sources
        const recommendations: ScoredSong[] = [];
        const seenVideoIds = new Set<string>();
        const perArtistCount = new Map<string, number>();

        const bumpArtist = (artist: string) => {
            if (!artist) return;
            perArtistCount.set(artist, (perArtistCount.get(artist) || 0) + 1);
        };

        const canAddArtist = (artist: string, cap = 4) => {
            return (perArtistCount.get(artist) || 0) < cap;
        };

        // 1. Suggested Songs You Might Like (35% weight) - Based on liked songs
        console.log(`🔍 Fetching suggestions based on ${likedSongs.length} liked songs...`);
        for (const liked of likedSongs.slice(0, 15)) {
            try {
                // Search for songs similar to liked ones
                const searchQuery = `${liked.title} ${liked.artist}`.substring(0, 50);
                const searchRes = await fetch(
                    `https://api.yuzone.me/search?q=${encodeURIComponent(searchQuery)}`
                );
                
                if (searchRes.ok) {
                    const results = await searchRes.json();
                    for (const result of results.slice(1, 4)) { // Skip first as it's likely the same song
                        const artist = Array.isArray(result.artists)
                            ? result.artists.join(", ")
                            : result.artist || result.artists || "Unknown Artist";

                        if (
                            !recentlyPlayedIds.has(result.videoId) &&
                            !seenVideoIds.has(result.videoId) &&
                            result.videoId !== liked.videoId &&
                            canAddArtist(artist, 5)
                        ) {
                            // weight boosted by how recent the liked track is
                            const recBoost = 0.6 + 0.4 * Math.exp(-likedSongs.indexOf(liked) / 10);
                            recommendations.push({
                                videoId: result.videoId,
                                title: result.title || "Unknown Title",
                                artist,
                                thumbnail: pickBestThumb(result),
                                duration: result.duration || "",
                                score: 0.35 * recBoost,
                                reason: "You might like",
                            });
                            seenVideoIds.add(result.videoId);
                            bumpArtist(artist);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch suggested songs:", error);
            }
        }

        // 2. Artists You Might Like (25% weight) - Discover new artists
        console.log(`🎤 Fetching songs from ${topArtists.length} top artists...`);
        for (const artist of topArtists.slice(0, 6)) {
            try {
                const searchQuery = artist;
                const searchRes = await fetch(
                    `https://api.yuzone.me/search?q=${encodeURIComponent(searchQuery)}`
                );
                
                if (searchRes.ok) {
                    const results = await searchRes.json();
                    console.log(`  Found ${results.length} results for artist: ${artist}`);
                    for (const result of results.slice(0, 3)) {
                        const recArtist = Array.isArray(result.artists)
                            ? result.artists.join(", ")
                            : result.artist || result.artists || "Unknown Artist";

                        if (
                            !recentlyPlayedIds.has(result.videoId) &&
                            !seenVideoIds.has(result.videoId) &&
                            canAddArtist(recArtist)
                        ) {
                            const affinity = artistFrequency.get(artist) || 1;
                            const normalization = Math.log10(affinity + 10);
                            recommendations.push({
                                videoId: result.videoId,
                                title: result.title || "Unknown Title",
                                artist: recArtist,
                                thumbnail: pickBestThumb(result),
                                duration: result.duration || "",
                                score: 0.22 * normalization,
                                reason: `More from ${artist}`,
                            });
                            seenVideoIds.add(result.videoId);
                            bumpArtist(recArtist);
                        }
                    }
                } else {
                    console.warn(`⚠️ Search API failed for artist "${artist}": ${searchRes.status}`);
                }
            } catch (error) {
                console.error("Failed to fetch artist songs:", error);
            }
        }
        console.log(`✅ Added ${recommendations.length} recommendations so far`);

        // 3. Based on Recent Plays (20% weight) - Less weight now
        const recentSongs = history.slice(0, 12);
        for (const song of recentSongs) {
            if (recentlyPlayedIds.has(song.videoId)) continue;

            // Search for similar songs using external API
            try {
                const searchQuery = `${song.artist}`.substring(0, 30); // Search by artist only for more variety
                const searchRes = await fetch(
                    `https://api.yuzone.me/search?q=${encodeURIComponent(searchQuery)}`
                );
                
                if (searchRes.ok) {
                    const results = await searchRes.json();
                    for (const result of results.slice(0, 3)) {
                        const artist = Array.isArray(result.artists)
                            ? result.artists.join(", ")
                            : result.artist || result.artists || "Unknown Artist";

                        if (
                            !recentlyPlayedIds.has(result.videoId) &&
                            !seenVideoIds.has(result.videoId) &&
                            result.videoId !== song.videoId &&
                            canAddArtist(artist)
                        ) {
                            const recencyBoost = 0.5 + 0.5 * Math.exp(-recentSongs.indexOf(song) / 6);
                            recommendations.push({
                                videoId: result.videoId,
                                title: result.title || "Unknown Title",
                                artist,
                                thumbnail: pickBestThumb(result),
                                duration: result.duration || "",
                                score: 0.18 * recencyBoost,
                                reason: `Because you played ${song.title}`,
                            });
                            seenVideoIds.add(result.videoId);
                            bumpArtist(artist);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch similar songs:", error);
            }
        }

        // 4. Trending in Your Style (15% weight)
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
                const popScore = Math.min(1, (trending.views || trending.popularity || 50) / 100);
                recommendations.push({
                    videoId: trending.videoId,
                    title: trending.title || "Unknown Title",
                    artist: trendingArtist || "Unknown Artist",
                    thumbnail: pickBestThumb(trending),
                    duration: trending.duration || "",
                    score: 0.12 + 0.05 * popScore,
                    reason: "Trending in your style",
                });
                seenVideoIds.add(trending.videoId);
                bumpArtist(trendingArtist);
            }
        }

        // 5. Fresh Discoveries (5% weight) - Random trending songs for variety
        for (const trending of trendingSongs.slice(10, 40)) {
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
                    thumbnail: pickBestThumb(trending),
                    duration: trending.duration || "",
                    score: 0.05 + Math.random() * 0.05,
                    reason: "Fresh discoveries",
                });
                seenVideoIds.add(trending.videoId);
                
                if (seenVideoIds.size > 80) break; // Increased limit
            }
        }

        // Sort by score and return top recommendations
        // Normalize scores for variety and add slight jitter for dynamism
        let sortedRecommendations = recommendations
            .map(rec => ({ ...rec, score: rec.score * (0.95 + Math.random() * 0.1) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 90);

        // 🤖 AI-POWERED ENHANCEMENT: Use Gemini to refine recommendations
        if (process.env.GEMINI_API_KEY && sortedRecommendations.length > 20) {
            try {
                console.log("🤖 Enhancing recommendations with Gemini AI...");
                
                const aiResult = await generateAIRecommendations({
                    userProfile: {
                        topArtists,
                        topGenres,
                        likedSongs: likedSongs.slice(0, 20).map((s: any) => ({
                            title: s.title,
                            artist: s.artist
                        })),
                        recentlyPlayed: history.slice(0, 15).map((s: any) => ({
                            title: s.title,
                            artist: s.artist
                        })),
                        listeningPatterns: {
                            frequency: history.length,
                            diversity: topArtists.length / Math.max(history.length, 1),
                        },
                    },
                    availableSongs: sortedRecommendations.map(r => ({
                        videoId: r.videoId,
                        title: r.title,
                        artist: r.artist
                    })),
                    contextMessage: "User is exploring their personalized For You page",
                });

                // Merge AI insights with existing recommendations
                if (aiResult.recommendations.length > 0) {
                    const aiMap = new Map(aiResult.recommendations.map(r => [r.videoId, r]));
                    
                    sortedRecommendations = sortedRecommendations.map(rec => {
                        const aiRec = aiMap.get(rec.videoId);
                        if (aiRec) {
                            return {
                                ...rec,
                                reason: aiRec.reason,
                                score: (rec.score * 0.4) + (aiRec.relevanceScore * 0.6), // Blend scores
                            };
                        }
                        return rec;
                    }).sort((a, b) => b.score - a.score);

                    console.log("✨ AI enhancement complete! Recommendations personalized.");
                }
            } catch (error) {
                console.error("⚠️ AI enhancement failed, using standard recommendations:", error);
            }
        }

        // Group by reason with better distribution
        const groupedRecommendations = {
            suggested: sortedRecommendations.filter(r => r.reason === "You might like").slice(0, 24),
            artistsYouMightLike: sortedRecommendations.filter(r => r.reason.includes("More from")).slice(0, 20),
            basedOnRecent: sortedRecommendations.filter(r => r.reason.includes("Because you played")).slice(0, 14),
            trendingInYourStyle: sortedRecommendations.filter(r => r.reason === "Trending in your style").slice(0, 12),
            freshDiscoveries: sortedRecommendations.filter(r => r.reason === "Fresh discoveries").slice(0, 20),
        };

        // Calculate total recommendations
        const totalRecommendations = 
            groupedRecommendations.suggested.length +
            groupedRecommendations.artistsYouMightLike.length +
            groupedRecommendations.basedOnRecent.length +
            groupedRecommendations.trendingInYourStyle.length +
            groupedRecommendations.freshDiscoveries.length;

        console.log(`📊 Total recommendations generated: ${totalRecommendations}`);

        // 🆕 FALLBACK: If no recommendations generated, use trending songs
        if (totalRecommendations === 0) {
            console.log("📝 No recommendations generated - using fallback strategy");
            
            if (trendingSongs.length > 0) {
                console.log(`✅ Showing ${trendingSongs.length} trending songs as fallback`);
                
                const trendingRecommendations = trendingSongs.map((song: any) => ({
                    videoId: song.videoId,
                    title: song.title || "Unknown Title",
                    artist: Array.isArray(song.artists)
                        ? song.artists.join(", ")
                        : song.artist || song.artists || "Unknown Artist",
                    thumbnail: pickBestThumb(song),
                    duration: song.duration || "3:30",
                    score: 1,
                    reason: "Popular right now",
                }));

                return NextResponse.json({
                    success: true,
                    recommendations: {
                        suggested: trendingRecommendations.slice(0, 15),
                        artistsYouMightLike: [],
                        basedOnRecent: [],
                        trendingInYourStyle: [],
                        freshDiscoveries: trendingRecommendations.slice(15, 50),
                    },
                    topArtists: topArtists.slice(0, 5),
                });
            } else {
                console.error("❌ No recommendations and no trending songs available!");
            }
        }

        // If very few recommendations, pad with trending songs
        if (totalRecommendations < 15 && trendingSongs.length > 0) {
            console.log(`⚠️ Only ${totalRecommendations} recommendations - padding with trending songs`);
            
            const existingIds = new Set(sortedRecommendations.map(r => r.videoId));
            const trendingToAdd = trendingSongs
                .filter((song: any) => !existingIds.has(song.videoId))
                .slice(0, 40)
                .map((song: any) => ({
                    videoId: song.videoId,
                    title: song.title || "Unknown Title",
                    artist: Array.isArray(song.artists)
                        ? song.artists.join(", ")
                        : song.artist || song.artists || "Unknown Artist",
                    thumbnail: pickBestThumb(song),
                    duration: song.duration || "3:30",
                    score: 0.5,
                    reason: "Fresh discoveries",
                }));

            groupedRecommendations.freshDiscoveries = [
                ...groupedRecommendations.freshDiscoveries,
                ...trendingToAdd
            ].slice(0, 40);
        }

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
