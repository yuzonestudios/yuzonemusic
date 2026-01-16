import { NextRequest, NextResponse } from "next/server";
import { searchSongs, searchArtists, searchAlbums } from "@/lib/youtube-music";
import { cache, CACHE_TTL } from "@/lib/cache";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");

        if (!query) {
            return NextResponse.json(
                { success: false, error: "Query parameter 'q' is required" },
                { status: 400 }
            );
        }

        // Check cache first
        const cacheKey = `search:${query}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                    'X-Cache': 'HIT'
                }
            });
        }

        // Use the user's external API
        const externalApiUrl = `https://api.yuzone.me/search?q=${encodeURIComponent(query)}`;

        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            console.error(`External API error: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("External API response sample:", data.slice(0, 2));

        // Ensure all songs have required fields
        const songs = data.map((song: any) => ({
            videoId: song.videoId || song.id || "",
            title: song.title || "Unknown Title",
            artist: Array.isArray(song.artists) 
                ? song.artists.join(", ") 
                : song.artist || song.artists || "Unknown Artist",
            thumbnail: song.thumbnail || song.thumbnails?.[0]?.url || "/placeholder-album.png",
            duration: song.duration || "0:00",
            album: song.album
        }));

        // The external API returns an array directly, wrap it in our expected format
        const result = {
            success: true,
            data: {
                songs: songs
            }
        };

        // Cache the result
        cache.set(cacheKey, result, CACHE_TTL.SEARCH);

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'X-Cache': 'MISS'
            }
        });

    } catch (error: any) {
        console.error("Search API error:", error);
        console.error("Error stack:", error.stack);
        return NextResponse.json(
            { success: false, error: "Failed to perform search", details: error.message },
            { status: 500 }
        );
    }
}
