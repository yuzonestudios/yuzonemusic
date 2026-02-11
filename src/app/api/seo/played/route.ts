import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SeoSong from "@/models/SeoSong";
import { getSongInfo } from "@/lib/youtube-music";

interface PlayedPayload {
    videoId: string;
    title?: string;
    artist?: string;
    thumbnail?: string;
    duration?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as PlayedPayload;
        const { videoId } = body;

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "videoId is required" },
                { status: 400 }
            );
        }

        await connectDB();

        let title = body.title;
        let artist = body.artist;
        let thumbnail = body.thumbnail;
        let duration = body.duration;

        if (!title || !artist || !thumbnail || !duration) {
            const info = await getSongInfo(videoId);
            if (info) {
                title = title || info.title;
                artist = artist || info.artist;
                thumbnail = thumbnail || info.thumbnail;
                duration = duration || info.duration;
            }
        }

        const safeTitle = title || "Unknown Title";
        const safeArtist = artist || "Unknown Artist";
        const safeThumbnail = thumbnail || "/placeholder-album.png";
        const safeDuration = duration || "0:00";

        await SeoSong.findOneAndUpdate(
            { videoId },
            {
                $set: {
                    title: safeTitle,
                    artist: safeArtist,
                    thumbnail: safeThumbnail,
                    duration: safeDuration,
                    lastPlayedAt: new Date(),
                },
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SEO played song error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to record played song" },
            { status: 500 }
        );
    }
}
