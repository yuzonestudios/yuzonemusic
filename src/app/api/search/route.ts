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

        // Use the user's external API with type parameter
        const externalApiUrl = `https://api.yuzone.me/search?q=${encodeURIComponent(query)}&type=${type}`;

        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            console.error(`External API error: ${response.status} ${response.statusText}`);
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();

        // Parse response based on type
        let result: SearchResponse = {};

        if (type === "all" || type === "songs") {
            const songsData = Array.isArray(data) ? data : data.songs || data.results || [];
            const songs: SearchSongResult[] = songsData.map((song: any) => ({
                type: "song" as const,
                videoId: song.videoId || song.id || "",
                title: song.title || "Unknown Title",
                artists: Array.isArray(song.artists)
                    ? song.artists
                    : [song.artist || song.artists || "Unknown Artist"],
                thumbnail: song.thumbnail || song.thumbnails?.[0]?.url || "/placeholder-album.png",
                duration: song.duration || "0:00",
            }));
            result.songs = songs;
        }

        if (type === "all" || type === "artists") {
            const artistsData = Array.isArray(data) ? data : data.artists || [];
            result.artists = artistsData.map((artist: any) => ({
                type: "artist" as const,
                name: artist.name || "Unknown Artist",
                browseId: artist.browseId || "",
                thumbnail: artist.thumbnail || "/placeholder-artist.png",
            }));
        }

        if (type === "all" || type === "albums") {
            const albumsData = Array.isArray(data) ? data : data.albums || [];
            result.albums = albumsData.map((album: any) => ({
                type: "album" as const,
                title: album.title || "Unknown Album",
                artists: Array.isArray(album.artists) ? album.artists : [album.artist || "Unknown Artist"],
                year: album.year,
                thumbnail: album.thumbnail || "/placeholder-album.png",
                browseId: album.browseId || "",
            }));
        }

        // Cache the result
        cache.set(cacheKey, result, CACHE_TTL.SEARCH);

        return successResponse(result);
    } catch (error: any) {
        console.error("Search API error:", error);
        return errorResponse("Failed to perform search", error.message);
    }
}
