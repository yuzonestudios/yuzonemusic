import { NextRequest, NextResponse } from "next/server";
import { getProxyStream } from "@/lib/youtube-music";
import { parseQuality, errorResponse } from "@/lib/api-utils";
import type { DownloadRequest, QUALITY_CONFIG } from "@/types/api";

/**
 * GET /download?id={videoId}&title={title}&quality={1|2|3}
 * Legacy endpoint for backward compatibility
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const videoId = searchParams.get("id");
        const title = searchParams.get("title") || "song";
        const quality = parseQuality(searchParams.get("quality"));

        if (!videoId) {
            return errorResponse("Video ID (id parameter) is required", undefined, 400);
        }

        return downloadAudio(videoId, title, quality);
    } catch (error) {
        console.error("Download API error:", error);
        return errorResponse("Download failed", String(error));
    }
}

/**
 * POST /download
 * Download audio with quality selection
 * Body: { videoId: string, format?: "mp3", quality?: 1 | 2 | 3 }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as DownloadRequest;
        const { videoId, quality = 2, format = "mp3" } = body;

        if (!videoId) {
            return errorResponse("videoId is required", undefined, 400);
        }

        const title = `audio.${format}`;
        const parsedQuality = parseQuality(String(quality));

        return downloadAudio(videoId, title, parsedQuality);
    } catch (error) {
        console.error("Download API error:", error);
        return errorResponse("Download failed", String(error));
    }
}

/**
 * Internal function to handle audio download with quality configuration
 */
async function downloadAudio(videoId: string, title: string, quality: 1 | 2 | 3) {
    try {
        // External API URL with quality parameter
        const externalApiUrl = "https://api.yuzone.me/download";

        // Try external API first
        try {
            const response = await fetch(externalApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoId,
                    format: "mp3",
                    quality,
                }),
            });

            if (response.ok) {
                const contentType = response.headers.get("Content-Type") || "audio/mpeg";
                const headers = new Headers();
                headers.set("Content-Type", contentType);
                headers.set("Content-Disposition", `attachment; filename="${title}"`);
                // Add quality info header
                headers.set("X-Audio-Quality", `${quality}`);

                return new NextResponse(response.body, { status: 200, headers });
            }
        } catch (externalError) {
            console.warn("External Download API failed, falling back to proxy...");
        }

        // Fallback to internal proxy streaming
        const proxyResponse = await getProxyStream(videoId);

        if (!proxyResponse || !proxyResponse.body) {
            return errorResponse("Download failed - unable to retrieve audio stream", undefined, 500);
        }

        const headers = new Headers();
        headers.set("Content-Type", "audio/mpeg");
        headers.set("Content-Disposition", `attachment; filename="${title}"`);
        headers.set("X-Audio-Quality", `${quality}`);

        return new NextResponse(proxyResponse.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("Download audio error:", error);
        return errorResponse("Internal server error during download", String(error));
    }
}
