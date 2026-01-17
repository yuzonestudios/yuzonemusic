import { cache, CACHE_TTL } from "@/lib/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, artist } = body;

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
            // Pass optional title/artist to improve hit rate
            body: JSON.stringify({ videoId, title, artist }),
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
        
        // Cache the lyrics
        cache.set(cacheKey, data, CACHE_TTL.LYRICS);
        
        return Response.json(data, {
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
