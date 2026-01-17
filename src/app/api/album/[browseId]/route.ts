import { NextRequest } from "next/server";
import { cache, CACHE_TTL } from "@/lib/cache";
import { successResponse, errorResponse } from "@/lib/api-utils";
import type { AlbumDetailsResponse } from "@/types/api";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ browseId: string }> }
) {
    try {
        const { browseId } = await params;

        if (!browseId) {
            return errorResponse("Album ID (browseId) is required", undefined, 400);
        }

        // Check cache first
        const cacheKey = `album:${browseId}`;
        const cached = cache.get<AlbumDetailsResponse>(cacheKey);
        if (cached) {
            return successResponse(cached);
        }

        // Fetch album details from external API
        // Example: https://api.yuzone.me/album/{browseId}
        const externalApiUrl = `https://api.yuzone.me/album/${encodeURIComponent(browseId)}`;

        try {
            const response = await fetch(externalApiUrl);

            if (response.ok) {
                const data = await response.json();

                const albumDetails: AlbumDetailsResponse = {
                    title: data.title || "Unknown Album",
                    artists: (data.artists || []).map((artist: any) => ({
                        name: artist.name || artist,
                        browseId: artist.browseId || `artist-${artist.name?.replace(/\s+/g, "-").toLowerCase()}` || "",
                    })),
                    year: data.year,
                    releaseDate: data.releaseDate,
                    thumbnail: data.thumbnail || "/placeholder-album.png",
                    browseId: browseId,
                    description: data.description,
                    duration: data.duration || "0:00",
                    tracks: (data.tracks || []).map((track: any) => ({
                        videoId: track.videoId || track.id || "",
                        title: track.title || "Unknown Track",
                        artists: Array.isArray(track.artists)
                            ? track.artists
                            : [track.artist || "Unknown Artist"],
                        duration: track.duration || "0:00",
                        thumbnail: track.thumbnail || data.thumbnail || "/placeholder-album.png",
                    })),
                };

                // Cache the result
                cache.set(cacheKey, albumDetails, CACHE_TTL.ALBUM_DETAILS);

                return successResponse(albumDetails);
            }
        } catch (externalError) {
            console.warn("External album API failed, returning mock data:", externalError);
        }

        // Fallback: Return structured response with minimal data
        const albumDetails: AlbumDetailsResponse = {
            title: "Album",
            artists: [],
            thumbnail: "/placeholder-album.png",
            browseId: browseId,
            duration: "0:00",
            tracks: [],
        };

        // Cache even the fallback response (with shorter TTL)
        cache.set(cacheKey, albumDetails, 60); // 1 minute TTL for fallback

        return successResponse(albumDetails);
    } catch (error: any) {
        console.error("Album details API error:", error);
        return errorResponse("Failed to fetch album details", error.message);
    }
}
