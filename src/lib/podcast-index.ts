import crypto from "crypto";

const PODCAST_INDEX_BASE_URL = "https://api.podcastindex.org/api/1.0";

interface PodcastIndexFeed {
    id: number;
    title: string;
    description?: string;
    author?: string;
    image?: string;
    artwork?: string;
    thumbnail?: string;
    language?: string;
    categories?: Record<string, string>;
    episodeCount?: number;
    lastUpdateTime?: number;
    lastCrawlTime?: number;
    url?: string;
    link?: string;
}

interface PodcastIndexEpisode {
    id: number;
    title: string;
    description?: string;
    image?: string;
    episodeImage?: string;
    enclosureUrl?: string;
    duration?: number;
    datePublished?: number;
    feedId: number;
    feedTitle?: string;
    feedAuthor?: string;
    guid?: string;
    link?: string;
}

function getPodcastIndexHeaders() {
    const apiKey = process.env.PODCASTINDEX_API_KEY;
    const apiSecret = process.env.PODCASTINDEX_API_SECRET;
    const userAgent = process.env.PODCASTINDEX_USER_AGENT || "YuzoneMusic/1.0";

    if (!apiKey || !apiSecret) {
        throw new Error("PodcastIndex API credentials are missing");
    }

    const authDate = Math.floor(Date.now() / 1000).toString();
    const authHash = crypto
        .createHash("sha1")
        .update(apiKey + apiSecret + authDate)
        .digest("hex");

    return {
        "User-Agent": userAgent,
        "X-Auth-Date": authDate,
        "X-Auth-Key": apiKey,
        Authorization: authHash,
    };
}

async function podcastIndexFetch<T>(path: string, params: Record<string, string | number | boolean>) {
    const url = new URL(`${PODCAST_INDEX_BASE_URL}${path}`);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });

    const response = await fetch(url.toString(), {
        headers: getPodcastIndexHeaders(),
        cache: "no-store",
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`PodcastIndex error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
}

export async function searchPodcastIndex(term: string, maxShows = 6, episodesPerShow = 3) {
    const searchResponse = await podcastIndexFetch<{ feeds?: PodcastIndexFeed[] }>("/search/byterm", {
        q: term,
        clean: true,
        max: maxShows,
    });

    const feeds = searchResponse.feeds || [];

    const episodesByFeed = await Promise.all(
        feeds.slice(0, maxShows).map(async (feed) => {
            const episodesResponse = await podcastIndexFetch<{ items?: PodcastIndexEpisode[] }>("/episodes/byfeedid", {
                id: feed.id,
                max: episodesPerShow,
                fulltext: false,
            });

            return {
                feedId: feed.id,
                episodes: episodesResponse.items || [],
            };
        })
    );

    return { feeds, episodesByFeed };
}

export function normalizePodcastImage(feed: PodcastIndexFeed | PodcastIndexEpisode) {
    const feedImage = "image" in feed ? feed.image : undefined;
    const episodeImage = "episodeImage" in feed ? feed.episodeImage : undefined;
    const artwork = "artwork" in feed ? feed.artwork : undefined;
    const thumbnail = "thumbnail" in feed ? feed.thumbnail : undefined;

    return episodeImage || feedImage || artwork || thumbnail || "/placeholder-album.png";
}

export function normalizePodcastCategories(categories?: Record<string, string>) {
    if (!categories) return [] as string[];
    return Object.values(categories);
}
