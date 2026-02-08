import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PlaybackHistory from "@/models/PlaybackHistory";
import LikedSong from "@/models/LikedSong";
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
    thumbnail?: string;
    songCount: number;
    songs: SmartSong[];
}

const KEYWORDS = {
    mood: ["chill", "lofi", "lo-fi", "ambient", "relax", "calm", "sleep", "study", "mellow", "soft", "acoustic", "dream", "sad", "love", "slow"],
    tempo: ["dance", "edm", "party", "club", "remix", "workout", "energy", "boost", "rock", "metal", "hip hop", "rap", "trap", "fast", "speed", "pop"],
    timeOfDay: ["night", "midnight", "moon", "late", "sunset", "dusk", "dawn", "morning", "sunrise", "evening", "after hours", "drive", "city", "neon"],
};

function pickThumbnail(song: SmartSong | undefined): string | undefined {
    return song?.thumbnail || undefined;
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
    sourceWeights: Map<string, number>
): SmartPlaylist {
    const scored = candidates
        .map((song) => ({
            song,
            score: scoreByKeywords(song, keywords, sourceWeights.get(song.videoId) || 0.5),
        }))
        .sort((a, b) => b.score - a.score);

    const selected: SmartSong[] = [];
    const seen = new Set<string>();

    for (const item of scored) {
        if (selected.length >= 25) break;
        if (!seen.has(item.song.videoId)) {
            seen.add(item.song.videoId);
            selected.push(item.song);
        }
    }

    if (selected.length < 12) {
        for (const song of candidates) {
            if (selected.length >= 25) break;
            if (!seen.has(song.videoId)) {
                seen.add(song.videoId);
                selected.push(song);
            }
        }
    }

    return {
        id,
        name,
        description,
        songs: selected,
        songCount: selected.length,
        thumbnail: pickThumbnail(selected[0]),
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

        const userId = (session.user as any)?.id || (session.user as any)?.sub;

        const [history, liked] = await Promise.all([
            PlaybackHistory.find({ userId }).sort({ playedAt: -1 }).limit(120).lean(),
            LikedSong.find({ userId }).sort({ likedAt: -1 }).limit(80).lean(),
        ]);

        const trending = await getTopCharts().catch(() => []);

        const sourceWeights = new Map<string, number>();
        const candidates: SmartSong[] = [];
        const pushCandidate = (item: any, weight: number) => {
            const normalized = normalizeSong(item);
            if (!normalized) return;
            if (!sourceWeights.has(normalized.videoId)) {
                candidates.push(normalized);
                sourceWeights.set(normalized.videoId, weight);
            }
        };

        liked.forEach((song: any) => pushCandidate(song, 2));
        history.forEach((song: any) => pushCandidate(song, 1.5));
        trending.forEach((song: any) => pushCandidate(song, 1));

        const playlists: SmartPlaylist[] = [
            buildPlaylist(
                "smart-mood-chill",
                "Chill Vibes",
                "Laid-back tracks for focus, relaxation, and late-night calm.",
                KEYWORDS.mood,
                candidates,
                sourceWeights
            ),
            buildPlaylist(
                "smart-tempo-energy",
                "High Energy",
                "Up-tempo picks to keep you moving and motivated.",
                KEYWORDS.tempo,
                candidates,
                sourceWeights
            ),
            buildPlaylist(
                "smart-time-night",
                "Night Drive",
                "Moody tracks curated for evenings, night rides, and city lights.",
                KEYWORDS.timeOfDay,
                candidates,
                sourceWeights
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
