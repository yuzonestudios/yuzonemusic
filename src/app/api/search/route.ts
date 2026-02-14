import { NextRequest } from "next/server";
import { cache, CACHE_TTL } from "@/lib/cache";
import { successResponse, errorResponse, parseSearchType, formatDuration } from "@/lib/api-utils";
import connectDB from "@/lib/mongodb";
import PodcastShow from "@/models/PodcastShow";
import PodcastEpisode from "@/models/PodcastEpisode";
import { searchPodcastIndex, normalizePodcastImage, normalizePodcastCategories } from "@/lib/podcast-index";
import type {
    SearchResponse,
    SearchSongResult,
    SearchPodcastShowResult,
    SearchPodcastEpisodeResult,
} from "@/types/api";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");
        const type = parseSearchType(searchParams.get("type"));

        if (!query) {
            return errorResponse("Query parameter 'q' is required", undefined, 400);
        }

        // Check cache first
        const cacheKey = `search:${query}:${type}`;
        const cached = cache.get<SearchResponse>(cacheKey);
        if (cached) {
            return successResponse(cached);
        }

        const includeMusic = type !== "podcasts";
        const includePodcasts = type === "podcasts" || type === "all";

        let musicData: any = null;
        let podcastsData: { shows: SearchPodcastShowResult[]; episodes: SearchPodcastEpisodeResult[] } | null = null;

        const tasks: Promise<void>[] = [];

        if (includeMusic) {
            tasks.push((async () => {
                // Use the user's external API with type parameter
                const externalApiUrl = `https://api.yuzone.me/search?q=${encodeURIComponent(query)}&type=${type}`;

                // Add timeout for faster failure detection
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

                try {
                    const response = await fetch(externalApiUrl, {
                        signal: controller.signal,
                        headers: {
                            "Accept-Encoding": "gzip, deflate",
                        },
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        console.error(`External API error: ${response.status} ${response.statusText}`);
                        throw new Error(`External API error: ${response.status}`);
                    }

                    musicData = await response.json();
                } catch (fetchError: any) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === "AbortError") {
                        console.error("Search request timeout");
                        throw new Error("Search request timeout");
                    }
                    throw fetchError;
                }
            })());
        }

        if (includePodcasts) {
            tasks.push((async () => {
                try {
                    const { feeds, episodesByFeed } = await searchPodcastIndex(query);

                    const shows: SearchPodcastShowResult[] = feeds.map((feed) => ({
                        type: "podcast-show",
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
                    }));

                    const rawEpisodes = episodesByFeed.flatMap(({ episodes }) => episodes);
                    const playableEpisodes = rawEpisodes.filter((episode) => Boolean(episode.enclosureUrl));

                    const episodes: SearchPodcastEpisodeResult[] = playableEpisodes.map((episode) => ({
                        type: "podcast-episode",
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
                    }));

                    podcastsData = { shows, episodes };

                    if (shows.length > 0 || episodes.length > 0) {
                        try {
                            await connectDB();

                            if (shows.length > 0) {
                                const showOps = shows.map((show) => ({
                                    updateOne: {
                                        filter: { feedId: show.feedId },
                                        update: {
                                            $set: {
                                                title: show.title,
                                                description: show.description,
                                                author: show.author,
                                                image: show.image,
                                                thumbnail: show.thumbnail,
                                                language: show.language,
                                                categories: show.categories || [],
                                                episodeCount: show.episodeCount,
                                                website: show.website,
                                                lastIndexedAt: new Date(),
                                            },
                                        },
                                        upsert: true,
                                    },
                                }));
                                await PodcastShow.bulkWrite(showOps, { ordered: false });
                            }

                            if (playableEpisodes.length > 0) {
                                const episodeOps = playableEpisodes.map((episode) => ({
                                    updateOne: {
                                        filter: { episodeId: episode.id },
                                        update: {
                                            $set: {
                                                feedId: episode.feedId,
                                                title: episode.title || "Untitled Episode",
                                                description: episode.description || undefined,
                                                image: normalizePodcastImage(episode),
                                                audioUrl: episode.enclosureUrl || undefined,
                                                duration: episode.duration || undefined,
                                                publishedAt: episode.datePublished
                                                    ? new Date(episode.datePublished * 1000)
                                                    : undefined,
                                                podcastTitle: episode.feedTitle || undefined,
                                                podcastAuthor: episode.feedAuthor || undefined,
                                                lastIndexedAt: new Date(),
                                            },
                                        },
                                        upsert: true,
                                    },
                                }));
                                await PodcastEpisode.bulkWrite(episodeOps, { ordered: false });
                            }
                        } catch (dbError) {
                            console.error("Podcast indexing failed:", dbError);
                        }
                    }
                } catch (podcastError) {
                    console.error("Podcast search failed:", podcastError);
                    if (type === "podcasts") {
                        throw podcastError;
                    }
                    podcastsData = { shows: [], episodes: [] };
                }
            })());
        }

        await Promise.all(tasks);

        // Parse response based on type
        let result: SearchResponse = {};

        if (includeMusic && musicData) {
            if (type === "all" || type === "songs") {
                const songsData = Array.isArray(musicData) ? musicData : musicData.songs || musicData.results || [];
                const songs: SearchSongResult[] = songsData.map((song: any) => ({
                    type: "song" as const,
                    videoId: song.videoId || song.id || "",
                    title: song.title || "Unknown Title",
                    artists: Array.isArray(song.artists)
                        ? song.artists
                        : [song.artist || song.artists || "Unknown Artist"],
                    thumbnail: song.thumbnail || song.thumbnails?.[0]?.url || "/placeholder-album.png",
                    duration: song.duration || "0:00",
                }));
                result.songs = songs;
            }

            if (type === "all" || type === "artists") {
                const artistsData = Array.isArray(musicData) ? musicData : musicData.artists || [];
                result.artists = artistsData.map((artist: any) => ({
                    type: "artist" as const,
                    name: artist.name || "Unknown Artist",
                    browseId: artist.browseId || "",
                    thumbnail: artist.thumbnail || "/placeholder-artist.png",
                }));
            }

            if (type === "all" || type === "albums") {
                const albumsData = Array.isArray(musicData) ? musicData : musicData.albums || [];
                result.albums = albumsData.map((album: any) => ({
                    type: "album" as const,
                    title: album.title || "Unknown Album",
                    artists: Array.isArray(album.artists) ? album.artists : [album.artist || "Unknown Artist"],
                    year: album.year,
                    thumbnail: album.thumbnail || "/placeholder-album.png",
                    browseId: album.browseId || "",
                }));
            }
        }

        if (includePodcasts && podcastsData) {
            result.podcasts = podcastsData;
        }

        // Cache the result
        cache.set(cacheKey, result, CACHE_TTL.SEARCH);

        return successResponse(result);
    } catch (error: any) {
        console.error("Search API error:", error);
        if (error.message === "Search request timeout") {
            return errorResponse("Search request timeout", "Request took too long");
        }
        return errorResponse("Failed to perform search", error.message);
    }
}
