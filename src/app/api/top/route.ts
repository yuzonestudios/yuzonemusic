import { NextResponse } from "next/server";
import { getTopCharts } from "@/lib/youtube-music";

export async function GET() {
    try {
        const songs = await getTopCharts();
        return NextResponse.json({ success: true, songs });
    } catch (error) {
        console.error("Top chart API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch top charts" },
            { status: 500 }
        );
    }
}
