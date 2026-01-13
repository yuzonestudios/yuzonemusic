import { NextRequest, NextResponse } from "next/server";
import { getAudioStream, getSongInfo } from "@/lib/youtube-music";

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

        // Parse Range header
        const rangeHeader = request.headers.get("range");
        let start: number | undefined;
        let end: number | undefined;

        if (rangeHeader) {
            const bytes = rangeHeader.replace(/bytes=/, "").split("-");
            start = parseInt(bytes[0], 10);
            end = bytes[1] ? parseInt(bytes[1], 10) : undefined;
        }

        // Get content length for proper streaming? 
        // youtubei.js download doesn't easily give total size upfront unless we do getBasicInfo.
        // But Next.js handles streaming.

        // We can get basic info to estimate content type/size but it slows it down.
        // We'll just stream. Browsers handle chunked encoding.

        const stream = await getAudioStream(videoId, { start, end });

        // Define headers
        const headers = new Headers();
        headers.set("Content-Type", "audio/mp4"); // Assuming m4a/mp4 usually
        headers.set("Cache-Control", "public, max-age=3600");

        // If range request, headers need status 206?
        // But without knowing total size, we can't send content-range header correctly?
        // youtubei.js creates a stream.

        return new NextResponse(stream as any, {
            status: 200, // Or 206 if we handled it, but streaming 200 works for most players
            headers,
        });

    } catch (error) {
        console.error("Stream API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to get stream" },
            { status: 500 }
        );
    }
}
