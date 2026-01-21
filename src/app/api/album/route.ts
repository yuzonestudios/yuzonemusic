import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/album?browseId=MPREb_...
 * Returns album details and songs (flat JSON) matching the requested format
 * Proxies to external API: https://api.yuzone.me/album?browseId=
 */
export async function GET(request: NextRequest) {
  try {
    const browseId = request.nextUrl.searchParams.get("browseId");
    if (!browseId || browseId.trim() === "") {
      return NextResponse.json({ detail: "browseId query parameter is required" }, { status: 400 });
    }

    // Call external API
    const externalApiUrl = `https://api.yuzone.me/album?browseId=${encodeURIComponent(browseId.trim())}`;
    const response = await fetch(externalApiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ detail: "Album not found" }, { status: 404 });
      }
      throw new Error(`External API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract album thumbnail to use as fallback for songs
    const albumThumbnail = data.thumbnail || data.thumbnails?.[0]?.url || "";

    // Normalize the response to ensure songs have thumbnails
    if (data.songs && Array.isArray(data.songs)) {
      data.songs = data.songs.map((song: any) => {
        // Normalize artists to array of objects with name property
        let artists = [];
        if (Array.isArray(song.artists)) {
          // If it's an array, check if items are strings or objects
          artists = song.artists.map((a: any) => 
            typeof a === 'string' ? { name: a } : (a.name ? a : { name: String(a) })
          );
        } else if (song.artist) {
          // If single artist string
          artists = [{ name: song.artist }];
        } else {
          artists = [{ name: "Unknown Artist" }];
        }

        return {
          videoId: song.videoId || song.id || "",
          title: song.title || "Unknown Title",
          artists: artists,
          duration: song.duration || song.durationSeconds || "0:00",
          thumbnail: song.thumbnail || song.thumbnails?.[0]?.url || albumThumbnail || "",
        };
      });
    }

    // Return the normalized data
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { detail: `Failed to fetch album songs: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
