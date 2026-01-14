import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import RecentlyPlayed from "@/models/RecentlyPlayed";
import PlaybackHistory from "@/models/PlaybackHistory";

// Get recently played songs
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20");

        await connectDB();

        const recentlyPlayed = await RecentlyPlayed.find({ userId: session.user.id })
            .sort({ playedAt: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, data: recentlyPlayed });
    } catch (error) {
        console.error("Error fetching history:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch history" },
            { status: 500 }
        );
    }
}

// Add to recently played
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { videoId, title, artist, thumbnail, duration, listenDuration } = body;

        if (!videoId || !title || !artist) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        await connectDB();

        // Update or create recently played entry
        await RecentlyPlayed.findOneAndUpdate(
            { userId: session.user.id, videoId },
            {
                title,
                artist,
                thumbnail: thumbnail || "/placeholder-album.png",
                duration: duration || "0:00",
                playedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        // Also add to playback history for analytics
        await PlaybackHistory.create({
            userId: session.user.id,
            videoId,
            title,
            artist,
            thumbnail: thumbnail || "/placeholder-album.png",
            duration: duration || "0:00",
            listenDuration: listenDuration || 0,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error adding to history:", error);
        return NextResponse.json(
            { success: false, error: "Failed to add to history" },
            { status: 500 }
        );
    }
}

// Clear history
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();

        await RecentlyPlayed.deleteMany({ userId: session.user.id });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error clearing history:", error);
        return NextResponse.json(
            { success: false, error: "Failed to clear history" },
            { status: 500 }
        );
    }
}
