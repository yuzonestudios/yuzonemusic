import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { url, source } = await req.json();

        if (!url || !source) {
            return NextResponse.json(
                { error: "URL and source are required" },
                { status: 400 }
            );
        }

        // Determine which external API to use
        const apiUrl = source === "spotify" 
            ? "https://api.yuzone.me/spotifyPlaylist"
            : "https://api.yuzone.me/youtubePlaylist";

        // Proxy the request to the external API
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`External API error (${response.status}):`, errorText);
            return NextResponse.json(
                { error: `Failed to fetch playlist: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error proxying playlist import:", error);
        return NextResponse.json(
            { error: "Failed to import playlist" },
            { status: 500 }
        );
    }
}
