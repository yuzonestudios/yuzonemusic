import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PlaybackHistory from "@/models/PlaybackHistory";
import LikedSong from "@/models/LikedSong";
import User from "@/models/User";
import { getTopCharts } from "@/lib/youtube-music";
import { cache, CACHE_TTL } from "@/lib/cache";

interface SmartSong {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
}

interface SmartPlaylist {
    id: string;
    name: string;
    description: string;
    insight?: string;
    thumbnail?: string;
    songCount: number;
    songs: SmartSong[];
    personalized: boolean;
}

const KEYWORDS = {
    mood: ["chill", "lofi", "lo-fi", "ambient", "relax", "calm", "sleep", "study", "mellow", "soft", "acoustic", "dream", "sad", "love", "slow"],
    tempo: ["dance", "edm", "party", "club", "remix", "workout", "energy", "boost", "rock", "metal", "hip hop", "rap", "trap", "fast", "speed", "pop"],
    timeOfDay: ["night", "midnight", "moon", "late", "sunset", "dusk", "dawn", "morning", "sunrise", "evening", "after hours", "drive", "city", "neon"],
};

const STOPWORDS = new Set([
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "from",
    "that",
    "this",
    "feat",
    "featuring",
    "ft",
    "remix",
    "mix",
    "edit",
    "live",
    "version",
    "song",
    "music",
    "audio",
    "official",
    "video",
    "lyrics",
]);

function pickThumbnail(song: SmartSong | undefined): string | undefined {
    return song?.thumbnail || undefined;
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function splitArtists(artistText: string): string[] {
    return artistText
        .toLowerCase()
        .replace(/\s*(feat\.|featuring|ft\.|&|x|,|\+|\/)\s*/g, ",")
        .split(",")
        .map((artist) => artist.trim())
        .filter(Boolean);
}

function normalizeSong(item: any): SmartSong | null {
    if (!item) return null;
    const videoId = item.videoId || item.id;
    if (!videoId) return null;

    const title = item.title || "Unknown Title";
    const artist = Array.isArray(item.artists)
        ? item.artists.map((a: any) => a.name || a).filter(Boolean).join(", ")
        : item.artist || item.authors?.join(", ") || "Unknown Artist";
    const thumbnail =
        item.thumbnail ||
        item.thumbnails?.[0]?.url ||
        item.thumbnails?.[0] ||
        item.image ||
        "";
    const duration = item.duration || "";

    return { videoId, title, artist, thumbnail, duration };
}

function scoreByKeywords(song: SmartSong, keywords: string[], sourceWeight: number): number {
    const text = `${song.title} ${song.artist}`.toLowerCase();
    let score = sourceWeight;
    keywords.forEach((keyword) => {
        if (text.includes(keyword)) score += 1;
    });
    return score;
}

function buildPlaylist(
    id: string,
    name: string,
    description: string,
    keywords: string[],
    candidates: SmartSong[],
    sourceWeights: Map<string, number>,
    options: {
        includeUserKeywords?: boolean;
        userKeywords?: string[];
        artistAffinity?: Map<string, number>;
        recencyScores?: Map<string, number>;
        playCounts?: Map<string, number>;
        likedIds?: Set<string>;
        extraBoostIds?: Set<string>;
        focusArtists?: string[];
        maxPerArtist?: number;
        maxSongs?: number;
        minSongs?: number;
        insight?: string;
        personalized?: boolean;
        requireKeywordMatch?: boolean;
        filterSong?: (song: SmartSong) => boolean;
        requiredKeywords?: string[];
        excludedKeywords?: string[];
    } = {}
): SmartPlaylist {
    const {
        includeUserKeywords = true,
        userKeywords = [],
        artistAffinity = new Map<string, number>(),
        recencyScores = new Map<string, number>(),
        playCounts = new Map<string, number>(),
        likedIds = new Set<string>(),
        extraBoostIds,
        focusArtists,
        maxPerArtist = 4,
        maxSongs = 25,
        minSongs = 12,
        insight,
        personalized = true,
        requireKeywordMatch = false,
        filterSong,
        requiredKeywords = [],
        excludedKeywords = [],
    } = options;

    const scopedCandidates = filterSong ? candidates.filter(filterSong) : candidates;

    const scored = scopedCandidates
        .map((song) => ({
            song,
            score: (() => {
                const baseWeight = sourceWeights.get(song.videoId) || 0.5;
                const text = `${song.title} ${song.artist}`.toLowerCase();
                const requiredMatch = requiredKeywords.length
                    ? requiredKeywords.some((keyword) => text.includes(keyword))
                    : true;
                const excludedMatch = excludedKeywords.length
                    ? excludedKeywords.some((keyword) => text.includes(keyword))
                    : false;
                const keywordScore = keywords.reduce((sum, keyword) => (text.includes(keyword) ? sum + 1 : sum), 0);
                const userKeywordScore = includeUserKeywords
                    ? userKeywords.reduce((sum, keyword) => (text.includes(keyword) ? sum + 1 : sum), 0)
                    : 0;
                const artists = splitArtists(song.artist);
                const artistScore = artists.reduce((sum, artist) => sum + (artistAffinity.get(artist) || 0), 0);
                const recencyScore = recencyScores.get(song.videoId) || 0;
                const playCount = Math.min(playCounts.get(song.videoId) || 0, 6);
                const likedBoost = likedIds.has(song.videoId) ? 1.2 : 0;
                const extraBoost = extraBoostIds?.has(song.videoId) ? 2 : 0;
                const focusBoost = focusArtists?.length
                    ? artists.reduce((sum, artist) => (focusArtists.includes(artist) ? sum + 1.5 : sum), 0)
                    : 0;

                const nameMatchOk = requireKeywordMatch ? keywordScore > 0 : true;
                if (!requiredMatch || excludedMatch || !nameMatchOk) {
                    return -999;
                }

                return (
                    baseWeight +
                    keywordScore * 0.8 +
                    userKeywordScore * 0.5 +
                    artistScore * 0.6 +
                    recencyScore * 2 +
                    playCount * 0.25 +
                    likedBoost +
                    extraBoost +
                    focusBoost
                );
            })(),
        }))
        .sort((a, b) => b.score - a.score);

    const selected: SmartSong[] = [];
    const seen = new Set<string>();
    const artistCounts = new Map<string, number>();

    for (const item of scored) {
        if (selected.length >= maxSongs) break;
        if (!seen.has(item.song.videoId)) {
            const primaryArtist = splitArtists(item.song.artist)[0] || "unknown";
            if (maxPerArtist && (artistCounts.get(primaryArtist) || 0) >= maxPerArtist) {
                continue;
            }
            seen.add(item.song.videoId);
            selected.push(item.song);
            artistCounts.set(primaryArtist, (artistCounts.get(primaryArtist) || 0) + 1);
        }
    }

    if (selected.length < minSongs) {
        for (const song of scopedCandidates) {
            if (selected.length >= maxSongs) break;
            if (!seen.has(song.videoId)) {
                const primaryArtist = splitArtists(song.artist)[0] || "unknown";
                if (maxPerArtist && (artistCounts.get(primaryArtist) || 0) >= maxPerArtist) {
                    continue;
                }
                seen.add(song.videoId);
                selected.push(song);
                artistCounts.set(primaryArtist, (artistCounts.get(primaryArtist) || 0) + 1);
            }
        }
    }

    return {
        id,
        name,
        description,
        insight,
        songs: selected,
        songCount: selected.length,
        thumbnail: pickThumbnail(selected[0]),
        personalized,
    };
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const cacheKey = `smart-playlists:${session.user.email}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        await connectDB();

        let userId = (session.user as any)?.id || (session.user as any)?.sub;

        if (!userId && session.user.email) {
            const user = await User.findOne({ email: session.user.email }).select("_id").lean();
            userId = user?._id;
        }

        const [history, liked] = await Promise.all([
            userId
                ? PlaybackHistory.find({ userId }).sort({ playedAt: -1 }).limit(120).lean()
                : Promise.resolve([]),
            userId
                ? LikedSong.find({ userId }).sort({ likedAt: -1 }).limit(80).lean()
                : Promise.resolve([]),
        ]);

        const trending = await getTopCharts().catch(() => []);

        const sourceWeights = new Map<string, number>();
        const candidates: SmartSong[] = [];
        const likedIds = new Set<string>();
        const playCounts = new Map<string, number>();
        const recencyScores = new Map<string, number>();
        const artistAffinity = new Map<string, number>();
        const keywordAffinity = new Map<string, number>();
        const now = Date.now();
        const recentHistoryIds = new Set<string>();
        const pushCandidate = (item: any, weight: number) => {
            const normalized = normalizeSong(item);
            if (!normalized) return;
            if (!sourceWeights.has(normalized.videoId)) {
                candidates.push(normalized);
                sourceWeights.set(normalized.videoId, weight);
            }
        };

        liked.forEach((song: any) => {
            pushCandidate(song, 2);
            if (song.videoId) likedIds.add(song.videoId);
            splitArtists(song.artist || "").forEach((artist) => {
                artistAffinity.set(artist, (artistAffinity.get(artist) || 0) + 1.8);
            });
            tokenize(`${song.title || ""} ${song.artist || ""}`).forEach((token) => {
                keywordAffinity.set(token, (keywordAffinity.get(token) || 0) + 1.2);
            });
        });

        history.forEach((song: any, index: number) => {
            pushCandidate(song, 1.5);
            if (song.videoId) {
                playCounts.set(song.videoId, (playCounts.get(song.videoId) || 0) + 1);
                if (index < 45) recentHistoryIds.add(song.videoId);
            }
            splitArtists(song.artist || "").forEach((artist) => {
                artistAffinity.set(artist, (artistAffinity.get(artist) || 0) + 1);
            });
            tokenize(`${song.title || ""} ${song.artist || ""}`).forEach((token) => {
                keywordAffinity.set(token, (keywordAffinity.get(token) || 0) + 0.6);
            });
            if (song.videoId && song.playedAt) {
                const playedAt = new Date(song.playedAt).getTime();
                const daysAgo = Math.max(0, (now - playedAt) / (1000 * 60 * 60 * 24));
                const recency = 1 / (1 + daysAgo / 10);
                const current = recencyScores.get(song.videoId) || 0;
                recencyScores.set(song.videoId, Math.max(current, recency));
            }
        });
        trending.forEach((song: any) => pushCandidate(song, 1));

        const topArtists = [...artistAffinity.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([artist]) => artist);

        const userKeywords = [...keywordAffinity.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([keyword]) => keyword);

        const focusArtist = topArtists[0];
        const focusArtistLabel = focusArtist ? focusArtist.replace(/\b\w/g, (l) => l.toUpperCase()) : null;
        const hasSignals = history.length + liked.length > 0;

        const playlists: SmartPlaylist[] = [
            buildPlaylist(
                "smart-favorites",
                "Your Favorites",
                "Songs you have liked and keep coming back to.",
                KEYWORDS.mood,
                candidates,
                sourceWeights,
                {
                    includeUserKeywords: true,
                    userKeywords,
                    artistAffinity,
                    recencyScores,
                    playCounts,
                    likedIds,
                    extraBoostIds: likedIds,
                    maxPerArtist: 5,
                    requiredKeywords: userKeywords.slice(0, 6),
                    insight: hasSignals ? "Built from your likes and top repeats." : "Popular picks to start your mix.",
                    personalized: hasSignals,
                }
            ),
            buildPlaylist(
                "smart-on-repeat",
                "On Repeat",
                "Recent listens with a smooth, familiar flow.",
                KEYWORDS.timeOfDay,
                candidates,
                sourceWeights,
                {
                    includeUserKeywords: true,
                    userKeywords,
                    artistAffinity,
                    recencyScores,
                    playCounts,
                    likedIds,
                    extraBoostIds: recentHistoryIds,
                    maxPerArtist: 4,
                    requiredKeywords: userKeywords.slice(0, 6),
                    insight: hasSignals ? "Focused on your recent plays." : "Popular tracks with smooth pacing.",
                    personalized: hasSignals,
                }
            ),
            buildPlaylist(
                "smart-mood-chill",
                "Chill Vibes",
                "Laid-back tracks shaped by your taste and mood.",
                KEYWORDS.mood,
                candidates,
                sourceWeights,
                {
                    includeUserKeywords: true,
                    userKeywords,
                    artistAffinity,
                    recencyScores,
                    playCounts,
                    likedIds,
                    maxPerArtist: 4,
                    requireKeywordMatch: true,
                    requiredKeywords: KEYWORDS.mood,
                    excludedKeywords: KEYWORDS.tempo,
                    insight: hasSignals ? "Weighted by your favorite artists." : "Mood-based picks to get started.",
                    personalized: hasSignals,
                }
            ),
            buildPlaylist(
                "smart-tempo-energy",
                "High Energy",
                "Up-tempo picks to keep you moving and motivated.",
                KEYWORDS.tempo,
                candidates,
                sourceWeights,
                {
                    includeUserKeywords: true,
                    userKeywords,
                    artistAffinity,
                    recencyScores,
                    playCounts,
                    likedIds,
                    maxPerArtist: 4,
                    requireKeywordMatch: true,
                    requiredKeywords: KEYWORDS.tempo,
                    excludedKeywords: KEYWORDS.mood,
                    insight: hasSignals ? "Balanced by energy and your history." : "Energy picks to kick things off.",
                    personalized: hasSignals,
                }
            ),
            buildPlaylist(
                "smart-time-night",
                focusArtistLabel ? `${focusArtistLabel} Mix` : "Artist Mix",
                "A focused artist mix based on who you play most.",
                KEYWORDS.timeOfDay,
                candidates,
                sourceWeights,
                {
                    includeUserKeywords: true,
                    userKeywords,
                    artistAffinity,
                    recencyScores,
                    playCounts,
                    likedIds,
                    focusArtists: focusArtist ? [focusArtist] : undefined,
                    maxPerArtist: 6,
                    minSongs: 10,
                    filterSong: focusArtist
                        ? (song) => {
                            const artists = splitArtists(song.artist);
                            return artists.includes(focusArtist);
                        }
                        : undefined,
                    insight: hasSignals
                        ? focusArtistLabel
                            ? `Top artist: ${focusArtistLabel}`
                            : "Based on your top artists."
                        : "Artist mix to start your taste profile.",
                    personalized: hasSignals,
                }
            ),
        ];

        const response = { success: true, playlists };
        cache.set(cacheKey, response, CACHE_TTL.RECOMMENDATIONS);
        return NextResponse.json(response);
    } catch (error) {
        console.error("Smart playlists error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate smart playlists" },
            { status: 500 }
        );
    }
}
