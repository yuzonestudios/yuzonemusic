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

    // Return the data as-is if it matches the expected format, or normalize it
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { detail: `Failed to fetch album songs: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
