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

        return NextResponse.json({ success: true, data: { url: streamUrl } });
    } catch (error) {
        console.error("Stream API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to get stream URL" },
            { status: 500 }
        );
    }
}
