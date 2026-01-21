import { NextRequest, NextResponse } from "next/server";
import { getAlbumByBrowseId } from "@/lib/youtube-music";

/**
 * GET /api/album?browseId=MPREb_...
 * Returns album details and songs (flat JSON) matching the requested format
 */
export async function GET(request: NextRequest) {
  try {
    const browseId = request.nextUrl.searchParams.get("browseId");
    if (!browseId || browseId.trim() === "") {
      return NextResponse.json({ detail: "browseId query parameter is required" }, { status: 400 });
    }

    const album = await getAlbumByBrowseId(browseId.trim());

    if (!album || !album.title || (album.songs?.length ?? 0) === 0) {
      return NextResponse.json({ detail: "Album not found" }, { status: 404 });
    }

    const response = {
      browseId: album.browseId,
      title: album.title,
      artists: album.artists.map(a => ({ name: a.name, browseId: a.browseId || "" })),
      songs: album.songs.map(s => ({
        videoId: s.videoId,
        title: s.title,
        artists: s.artists.map(a => ({ name: a.name, id: a.id || "" })),
        album: s.album || album.title,
        duration: s.duration,
        thumbnail: s.thumbnail,
        isExplicit: Boolean(s.isExplicit),
        isAvailable: s.isAvailable !== false,
      })),
      totalSongs: album.songs.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { detail: `Failed to fetch album songs: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
