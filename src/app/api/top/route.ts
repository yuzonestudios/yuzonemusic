import { NextResponse } from "next/server";
import { getTopCharts } from "@/lib/youtube-music";
import { cache, CACHE_TTL } from "@/lib/cache";

export async function GET() {
    try {
        // Check cache first
        const cacheKey = 'top-charts';
        const cached = cache.get(cacheKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: {
                    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                    'X-Cache': 'HIT'
                }
            });
        }

        const songs = await getTopCharts();
        const response = { success: true, songs };
        
        // Cache the result
        cache.set(cacheKey, response, CACHE_TTL.TOP_CHARTS);
        
        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                'X-Cache': 'MISS'
            }
        });
    } catch (error) {
        console.error("Top chart API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch top charts" },
            { status: 500 }
        );
    }
}
