import { cache, CACHE_TTL } from "@/lib/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, artist, trackName, artistName } = body;
        const resolvedTrackName = typeof trackName === "string" && trackName.trim()
            ? trackName.trim()
            : (typeof title === "string" ? title.trim() : "");
        const resolvedArtistName = typeof artistName === "string" && artistName.trim()
            ? artistName.trim()
            : (typeof artist === "string" ? artist.trim() : "");

        if (!videoId) {
            return Response.json(
                { error: "videoId is required" },
                { status: 400 }
            );
        }

        // Check cache first
        const cacheKey = `lyrics:${videoId}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return Response.json(cached, {
                headers: {
                    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
                    'X-Cache': 'HIT'
                }
            });
        }

        const response = await fetch("https://api.yuzone.me/lyrics", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // Pass optional names to improve hit rate
            body: JSON.stringify({
                videoId,
                trackName: resolvedTrackName || undefined,
                artistName: resolvedArtistName || undefined,
            }),
        });

        if (!response.ok) {
            // Gracefully return empty lyrics to avoid client errors
            let details: any = null;
            try { details = await response.json(); } catch {}
            return Response.json(
                { lyrics: "", error: details?.error || "Failed to fetch lyrics" },
                { status: 200, headers: { 'X-Error-Status': String(response.status) } }
            );
        }

        const data = await response.json();
        const apiError = typeof data?.detail === "string" && data.detail.trim()
            ? data.detail.trim()
            : null;
        const resolvedLyrics = typeof data?.syncedLyrics === "string" && data.syncedLyrics.trim()
            ? data.syncedLyrics
            : (typeof data?.lyrics === "string" ? data.lyrics : "");
        const normalized = {
            lyrics: resolvedLyrics,
            source: data?.source ?? null,
            returner: data?.returner ?? null,
            error: apiError || undefined,
        };

        if (apiError) {
            return Response.json(
                { lyrics: "", error: apiError, source: normalized.source, returner: normalized.returner },
                { status: 200, headers: { 'X-Error-Status': '200' } }
            );
        }

        // Cache the lyrics
        cache.set(cacheKey, normalized, CACHE_TTL.LYRICS);

        return Response.json(normalized, {
            headers: {
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
                'X-Cache': 'MISS'
            }
        });
    } catch (error) {
        console.error("Lyrics API error:", error);
        // Gracefully return empty lyrics on internal errors
        return Response.json(
            { lyrics: "", error: "Internal server error" },
            { status: 200, headers: { 'X-Error-Status': '500' } }
        );
    }
}
