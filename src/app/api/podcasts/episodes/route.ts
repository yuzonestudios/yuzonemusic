import { NextRequest, NextResponse } from "next/server";
import { getPodcastEpisodesByFeedId, normalizePodcastImage } from "@/lib/podcast-index";
import { formatDuration } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    try {
        const feedIdParam = request.nextUrl.searchParams.get("feedId");
        const feedId = Number.parseInt(feedIdParam || "", 10);
        const limitParam = request.nextUrl.searchParams.get("limit");
        const beforeParam = request.nextUrl.searchParams.get("before");

        if (!Number.isFinite(feedId)) {
            return NextResponse.json(
                { success: false, error: "feedId is required" },
                { status: 400 }
            );
        }

        const limit = Math.min(Number.parseInt(limitParam || "20", 10) || 20, 50);
        const before = beforeParam ? Number.parseInt(beforeParam, 10) : null;

        const episodes = await getPodcastEpisodesByFeedId(feedId, 200);
        const sorted = episodes
            .filter((episode) => episode.enclosureUrl)
            .sort((a, b) => (b.datePublished || 0) - (a.datePublished || 0));

        const filtered = before
            ? sorted.filter((episode) => (episode.datePublished || 0) < before)
            : sorted;

        const page = filtered.slice(0, limit);
        const nextBefore = page.length === limit ? (page[page.length - 1].datePublished || null) : null;

        const response = {
            episodes: page.map((episode) => ({
                episodeId: episode.id,
                feedId: episode.feedId,
                title: episode.title || "Untitled Episode",
                description: episode.description || undefined,
                image: normalizePodcastImage(episode),
                audioUrl: episode.enclosureUrl || undefined,
                duration: formatDuration(episode.duration || 0),
                publishedAt: episode.datePublished
                    ? new Date(episode.datePublished * 1000).toISOString()
                    : undefined,
                podcastTitle: episode.feedTitle || undefined,
                podcastAuthor: episode.feedAuthor || undefined,
            })),
            nextBefore,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error("Podcast episodes error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to load podcast episodes" },
            { status: 500 }
        );
    }
}
