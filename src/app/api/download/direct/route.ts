import { NextRequest } from "next/server";
import { getProxyStream } from "@/lib/youtube-music";
import { parseQuality, errorResponse } from "@/lib/api-utils";
import type { DownloadRequest } from "@/types/api";

/**
 * POST /download/direct
 * Direct high-quality audio download (bypasses quality negotiation)
 * Supports quality 3 (320 kbps) by default
 *
 * Body: { videoId: string, format?: "mp4", quality?: 1 | 2 | 3 }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as DownloadRequest;
        const { videoId, quality = 3, format = "mp4" } = body;

        if (!videoId) {
            return errorResponse("videoId is required", undefined, 400);
        }

        // Direct endpoint defaults to high quality
        const parsedQuality = parseQuality(String(quality)) as 1 | 2 | 3;
        const title = `audio.${format}`;

        // Call external API for high-quality direct download
        const externalApiUrl = "https://api.yuzone.me/download/direct";

        try {
            const response = await fetch(externalApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoId,
                    format,
                    quality: parsedQuality,
                }),
            });

            if (response.ok) {
                const contentType = response.headers.get("Content-Type") || "audio/mpeg";
                const headers = new Headers();
                headers.set("Content-Type", contentType);
                headers.set("Content-Disposition", `attachment; filename="${title}"`);
                headers.set("X-Audio-Quality", `${parsedQuality}`);
                headers.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

                return new Response(response.body, { status: 200, headers });
            }
        } catch (externalError) {
            console.warn("External direct download API failed, falling back to proxy...");
        }

        // Fallback to internal proxy streaming with best quality
        const proxyResponse = await getProxyStream(videoId);

        if (!proxyResponse || !proxyResponse.body) {
            return errorResponse(
                "Direct download failed",
                "Unable to retrieve audio stream",
                500
            );
        }

        const headers = new Headers();
        headers.set("Content-Type", "audio/mpeg");
        headers.set("Content-Disposition", `attachment; filename="${title}"`);
        headers.set("X-Audio-Quality", "3"); // Proxy provides best available
        headers.set("Cache-Control", "public, max-age=86400");

        return new Response(proxyResponse.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("Direct download API error:", error);
        return errorResponse("Direct download failed", String(error));
    }
}

/**
 * GET /download/direct?id={videoId}&title={title}
 * Legacy GET support for direct downloads
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const videoId = searchParams.get("id");
        const title = searchParams.get("title") || "audio.mp4";

        if (!videoId) {
            return errorResponse("Video ID (id parameter) is required", undefined, 400);
        }

        // Use quality 3 (high quality) for direct downloads
        const externalApiUrl = "https://api.yuzone.me/download/direct";

        try {
            const response = await fetch(externalApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoId,
                    format: "mp4",
                    quality: 3,
                }),
            });

            if (response.ok) {
                const contentType = response.headers.get("Content-Type") || "audio/mpeg";
                const headers = new Headers();
                headers.set("Content-Type", contentType);
                headers.set("Content-Disposition", `attachment; filename="${title}"`);
                headers.set("X-Audio-Quality", "3");
                headers.set("Cache-Control", "public, max-age=86400");

                return new Response(response.body, { status: 200, headers });
            }
        } catch (externalError) {
            console.warn("External direct download API failed, falling back to proxy...");
        }

        // Fallback to internal proxy
        const proxyResponse = await getProxyStream(videoId);

        if (!proxyResponse || !proxyResponse.body) {
            return errorResponse("Download failed", "Unable to retrieve audio", 500);
        }

        const headers = new Headers();
        headers.set("Content-Type", "audio/mpeg");
        headers.set("Content-Disposition", `attachment; filename="${title}"`);
        headers.set("X-Audio-Quality", "3");
        headers.set("Cache-Control", "public, max-age=86400");

        return new Response(proxyResponse.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("Direct download GET error:", error);
        return errorResponse("Download failed", String(error));
    }
}
