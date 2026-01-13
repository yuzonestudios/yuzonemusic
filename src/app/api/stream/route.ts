import { NextRequest, NextResponse } from "next/server";
import { getStreamUrl } from "@/lib/youtube-music";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const videoId = searchParams.get("id");

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "Video ID is required" },
                { status: 400 }
            );
        }

        const streamUrl = await getStreamUrl(videoId);

        if (!streamUrl) {
            return NextResponse.json(
                { success: false, error: "Could not get stream URL" },
                { status: 404 }
            );
        }

        // Fetch the audio stream from Google with headers to mimic a browser
        const response = await fetch(streamUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://music.youtube.com/",
                "Origin": "https://music.youtube.com/",
                // Forward range header if present for seeking
                ...(request.headers.get("range") && { Range: request.headers.get("range")! }),
            },
        });

        if (!response.ok) {
            console.error("Upstream stream error:", response.status, response.statusText);
            return NextResponse.json(
                { success: false, error: "Failed to fetch upstream stream" },
                { status: response.status }
            );
        }

        // Create headers for the response
        const headers = new Headers();
        headers.set("Content-Type", response.headers.get("Content-Type") || "audio/webm");
        if (response.headers.has("Content-Length")) {
            headers.set("Content-Length", response.headers.get("Content-Length")!);
        }
        if (response.headers.has("Content-Range")) {
            headers.set("Content-Range", response.headers.get("Content-Range")!);
            // If partial content, status should be 206
            if (response.status === 206) {
                // Next.js NextResponse with status 206
                return new NextResponse(response.body, {
                    status: 206,
                    headers,
                });
            }
        }

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error("Stream API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to get stream URL" },
            { status: 500 }
        );
    }
}
