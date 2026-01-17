import { NextRequest } from "next/server";
import { cache, CACHE_TTL } from "@/lib/cache";
import { successResponse, errorResponse, parseSearchType } from "@/lib/api-utils";
import type { SearchResponse, SearchSongResult } from "@/types/api";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");
        const type = parseSearchType(searchParams.get("type"));

        if (!query) {
            return errorResponse("Query parameter 'q' is required", undefined, 400);
        }

        // Check cache first
        const cacheKey = `search:${query}:${type}`;
        const cached = cache.get<SearchResponse>(cacheKey);
        if (cached) {
            return successResponse(cached);
        }

        // Use the user's external API
        const externalApiUrl = `https://api.yuzone.me/search?q=${encodeURIComponent(query)}`;

        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            console.error(`External API error: ${response.status} ${response.statusText}`);
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();

        // Parse songs from external API response
        const songs: SearchSongResult[] = data.map((song: any) => ({
            type: "song" as const,
            videoId: song.videoId || song.id || "",
            title: song.title || "Unknown Title",
            artists: Array.isArray(song.artists)
                ? song.artists
                : [song.artist || song.artists || "Unknown Artist"],
            thumbnail: song.thumbnail || song.thumbnails?.[0]?.url || "/placeholder-album.png",
            duration: song.duration || "0:00",
        }));

        // Build response based on type filter
        let result: SearchResponse = {};

        if (type === "all" || type === "songs") {
            result.songs = songs;
        }

        // For artists and albums, we would need additional logic
        // Since the external API returns songs, we can extract artist info from songs
        if (type === "all" || type === "artists") {
            // Extract unique artists from songs
            const artistMap = new Map<string, { name: string; browseId: string; thumbnail: string }>();
            songs.forEach((song) => {
                song.artists.forEach((artist) => {
                    if (!artistMap.has(artist)) {
                        artistMap.set(artist, {
                            name: artist,
                            browseId: `artist-${artist.replace(/\s+/g, "-").toLowerCase()}`,
                            thumbnail: song.thumbnail,
                        });
                    }
                });
            });
            result.artists = Array.from(artistMap.values()).slice(0, 10).map((artist) => ({
                type: "artist" as const,
                ...artist,
            }));
        }

        // For albums, extract from songs if available
        if (type === "all" || type === "albums") {
            result.albums = [];
        }

        // Cache the result
        cache.set(cacheKey, result, CACHE_TTL.SEARCH);

        return successResponse(result);
    } catch (error: any) {
        console.error("Search API error:", error);
        return errorResponse("Failed to perform search", error.message);
    }
}
