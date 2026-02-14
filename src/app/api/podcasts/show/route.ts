import { NextRequest, NextResponse } from "next/server";
import { getPodcastByFeedId, normalizePodcastCategories, normalizePodcastImage } from "@/lib/podcast-index";

export async function GET(request: NextRequest) {
    try {
        const feedIdParam = request.nextUrl.searchParams.get("feedId");
        const feedId = Number.parseInt(feedIdParam || "", 10);

        if (!Number.isFinite(feedId)) {
            return NextResponse.json(
                { success: false, error: "feedId is required" },
                { status: 400 }
            );
        }

        const feed = await getPodcastByFeedId(feedId);
        if (!feed) {
            return NextResponse.json(
                { success: false, error: "Podcast not found" },
                { status: 404 }
            );
        }

        const data = {
            feedId: feed.id,
            title: feed.title || "Unknown Podcast",
            description: feed.description || undefined,
            author: feed.author || undefined,
            image: normalizePodcastImage(feed),
            thumbnail: feed.thumbnail || normalizePodcastImage(feed),
            language: feed.language || undefined,
            categories: normalizePodcastCategories(feed.categories),
            episodeCount: feed.episodeCount || undefined,
            website: feed.link || undefined,
        };

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("Podcast show error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to load podcast" },
            { status: 500 }
        );
    }
}
