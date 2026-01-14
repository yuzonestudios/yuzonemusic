import { NextRequest, NextResponse } from "next/server";
import { searchSongs, searchArtists, searchAlbums } from "@/lib/youtube-music";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");

        if (!query) {
            return NextResponse.json(
                { success: false, error: "Query parameter 'q' is required" },
                { status: 400 }
            );
        }

        // Use the user's external API
        const externalApiUrl = `https://api.yuzone.me/search?q=${encodeURIComponent(query)}`;

        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();

        // The external API returns an array directly, wrap it in our expected format
        return NextResponse.json({
            success: true,
            data: {
                songs: data
            }
        });

    } catch (error) {
        console.error("Search API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to perform search" },
            { status: 500 }
        );
    }
}
