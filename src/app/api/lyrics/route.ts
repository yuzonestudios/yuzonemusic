import { cache, CACHE_TTL } from "@/lib/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId } = body;

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
            body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
            return Response.json(
                { error: "Failed to fetch lyrics" },
                { status: response.status }
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
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
