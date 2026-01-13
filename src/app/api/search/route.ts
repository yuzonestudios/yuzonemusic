import { NextRequest, NextResponse } from "next/server";
import { searchSongs, searchArtists, searchAlbums } from "@/lib/youtube-music";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");
        const type = searchParams.get("type") || "song"; // song, artist, album, all
        const limit = parseInt(searchParams.get("limit") || "20");

        if (!query) {
            return NextResponse.json(
                { success: false, error: "Query parameter 'q' is required" },
                { status: 400 }
            );
        }

        let results;

        switch (type) {
            case "song":
                results = { songs: await searchSongs(query, limit) };
                break;
            case "artist":
                results = { artists: await searchArtists(query, limit) };
                break;
            case "album":
                results = { albums: await searchAlbums(query, limit) };
                break;
            case "all":
                const [songs, artists, albums] = await Promise.all([
                    searchSongs(query, limit),
                    searchArtists(query, Math.min(limit, 10)),
                    searchAlbums(query, Math.min(limit, 10)),
                ]);
                results = { songs, artists, albums };
                break;
            default:
                return NextResponse.json(
                    { success: false, error: "Invalid type. Use: song, artist, album, or all" },
                    { status: 400 }
                );
        }

        return NextResponse.json({ success: true, data: results });
    } catch (error) {
        console.error("Search API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to perform search" },
            { status: 500 }
        );
    }
}
