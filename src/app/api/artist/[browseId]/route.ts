import { NextRequest } from "next/server";
import { cache, CACHE_TTL } from "@/lib/cache";
import { successResponse, errorResponse, formatDuration } from "@/lib/api-utils";
import type { ArtistDetailsResponse } from "@/types/api";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ browseId: string }> }
) {
    try {
        const { browseId } = await params;

        if (!browseId) {
            return errorResponse("Artist ID (browseId) is required", undefined, 400);
        }

        // Check cache first
        const cacheKey = `artist:${browseId}`;
        const cached = cache.get<ArtistDetailsResponse>(cacheKey);
        if (cached) {
            return successResponse(cached);
        }

        // For now, return a structured response with placeholder data
        // In production, you would call the external YouTube Music API or your backend service
        // that has artist details fetching capability

        // Example: https://api.yuzone.me/artist/{browseId}
        // This endpoint would need to be implemented in your backend
        const externalApiUrl = `https://api.yuzone.me/artist/${encodeURIComponent(browseId)}`;

        try {
            const response = await fetch(externalApiUrl);

            if (response.ok) {
                const data = await response.json();

                const artistDetails: ArtistDetailsResponse = {
                    name: data.name || "Unknown Artist",
                    description: data.description,
                    thumbnail: data.thumbnail || "/placeholder-album.png",
                    browseId: browseId,
                    topSongs: (data.topSongs || []).map((song: any) => ({
                        videoId: song.videoId || song.id || "",
                        title: song.title || "Unknown Title",
                        duration: song.duration || "0:00",
                        thumbnail: song.thumbnail || "/placeholder-album.png",
                    })),
                    albums: (data.albums || []).map((album: any) => ({
                        browseId: album.browseId || album.id || "",
                        title: album.title || "Unknown Album",
                        year: album.year,
                        thumbnail: album.thumbnail || "/placeholder-album.png",
                        trackCount: album.trackCount,
                    })),
                    singles: (data.singles || []).map((single: any) => ({
                        browseId: single.browseId || single.id || "",
                        title: single.title || "Unknown Single",
                        year: single.year,
                        thumbnail: single.thumbnail || "/placeholder-album.png",
                        trackCount: single.trackCount,
                    })),
                };

                // Cache the result
                cache.set(cacheKey, artistDetails, CACHE_TTL.ARTIST_DETAILS);

                return successResponse(artistDetails);
            }
        } catch (externalError) {
            console.warn("External artist API failed, returning mock data:", externalError);
        }

        // Fallback: Return structured response with minimal data
        const artistDetails: ArtistDetailsResponse = {
            name: "Artist",
            description: "Unable to fetch artist details. Please try again later.",
            thumbnail: "/placeholder-album.png",
            browseId: browseId,
            topSongs: [],
            albums: [],
            singles: [],
        };

        // Cache even the fallback response (with shorter TTL)
        cache.set(cacheKey, artistDetails, 60); // 1 minute TTL for fallback

        return successResponse(artistDetails);
    } catch (error: any) {
        console.error("Artist details API error:", error);
        return errorResponse("Failed to fetch artist details", error.message);
    }
}
