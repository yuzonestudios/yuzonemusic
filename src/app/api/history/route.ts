import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import RecentlyPlayed from "@/models/RecentlyPlayed";
import PlaybackHistory from "@/models/PlaybackHistory";
import User from "@/models/User";

// Get recently played songs
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20");

        await connectDB();

        let userId = (session.user as any)?.id || (session.user as any)?.sub;
        if (!userId && session.user.email) {
            const user = await User.findOne({ email: session.user.email }).select("_id").lean();
            userId = user?._id;
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        const recentlyPlayed = await RecentlyPlayed.find({ userId })
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

        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { videoId, title, artist, thumbnail, duration, listenDuration, artists, sessionId } = body;

        // Accept either `artist` (string) or `artists` (string[]) from clients
        const artistStr = (typeof artist === "string" && artist.trim().length > 0)
            ? artist
            : (Array.isArray(artists)
                ? (artists[0] || artists.filter(Boolean).join(", "))
                : undefined);

        if (!videoId || !title || !artistStr) {
            console.error("Missing required fields:", { videoId, title, artist, artists, body });
            return NextResponse.json(
                { success: false, error: `Missing required fields. videoId: ${!!videoId}, title: ${!!title}, artist: ${!!artistStr}` },
                { status: 400 }
            );
        }

        // Only save to history if song has been played for at least 20 seconds
        if (!listenDuration || listenDuration < 20) {
            return NextResponse.json({ 
                success: true, 
                message: "Song not played long enough to save to history" 
            });
        }

        await connectDB();

        let userId = (session.user as any)?.id || (session.user as any)?.sub;
        if (!userId && session.user.email) {
            const user = await User.findOne({ email: session.user.email }).select("_id").lean();
            userId = user?._id;
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Update or create recently played entry
        await RecentlyPlayed.findOneAndUpdate(
            { userId, videoId },
            {
                title,
                artist: artistStr,
                thumbnail: thumbnail || "/placeholder-album.png",
                duration: duration || "0:00",
                playedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        // Check if count exceeds 50 and delete oldest if needed
        const count = await RecentlyPlayed.countDocuments({ userId });
        if (count > 50) {
            const oldestEntry = await RecentlyPlayed.findOne({ userId })
                .sort({ playedAt: 1 })
                .lean();
            
            if (oldestEntry) {
                await RecentlyPlayed.deleteOne({ _id: oldestEntry._id });
            }
        }

        // Also add/update playback history for analytics
        if (sessionId) {
            await PlaybackHistory.findOneAndUpdate(
                { userId, sessionId },
                {
                    $set: {
                        videoId,
                        title,
                        artist: artistStr,
                        thumbnail: thumbnail || "/placeholder-album.png",
                        duration: duration || "0:00",
                    },
                    $max: { listenDuration: listenDuration || 0 },
                    $setOnInsert: { playedAt: new Date() },
                },
                { upsert: true, new: true }
            );
        } else {
            await PlaybackHistory.create({
                userId,
                videoId,
                title,
                artist: artistStr,
                thumbnail: thumbnail || "/placeholder-album.png",
                duration: duration || "0:00",
                listenDuration: listenDuration || 0,
            });
        }

        // Keep history long enough to compute monthly listening time
        const retentionDays = 60;
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        await PlaybackHistory.deleteMany({
            userId,
            playedAt: { $lt: cutoffDate },
        });

        // Safety cap to prevent unbounded growth
        const historyCount = await PlaybackHistory.countDocuments({ userId });
        const maxHistoryEntries = 3000;
        if (historyCount > maxHistoryEntries) {
            const entriesToDelete = await PlaybackHistory.find({ userId })
                .sort({ playedAt: 1 })
                .limit(historyCount - maxHistoryEntries)
                .lean();

            if (entriesToDelete.length > 0) {
                const idsToDelete = entriesToDelete.map((entry: any) => entry._id);
                await PlaybackHistory.deleteMany({ _id: { $in: idsToDelete } });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error adding to history:", error);
        console.error("Error details:", error.message, error.stack);
        return NextResponse.json(
            { success: false, error: "Failed to add to history", details: error.message },
            { status: 500 }
        );
    }
}

// Clear history
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();

        let userId = (session.user as any)?.id || (session.user as any)?.sub;
        if (!userId && session.user.email) {
            const user = await User.findOne({ email: session.user.email }).select("_id").lean();
            userId = user?._id;
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        await RecentlyPlayed.deleteMany({ userId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error clearing history:", error);
        return NextResponse.json(
            { success: false, error: "Failed to clear history" },
            { status: 500 }
        );
    }
}
