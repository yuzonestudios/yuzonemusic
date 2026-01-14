import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import LikedSong from "@/models/LikedSong";
import User from "@/models/User";

// Get liked songs
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
        const checkId = searchParams.get("check");

        // Optimization: Check existence of specific song
        if (checkId) {
            await connectDB();
            const exists = await LikedSong.exists({
                userId: session.user.id,
                videoId: checkId
            });
            return NextResponse.json({ success: true, isLiked: !!exists });
        }

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        await connectDB();

        const [likedSongs, total] = await Promise.all([
            LikedSong.find({ userId: session.user.id })
                .sort({ likedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            LikedSong.countDocuments({ userId: session.user.id })
        ]);

        return NextResponse.json({
            success: true,
            data: likedSongs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching liked songs:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch liked songs" },
            { status: 500 }
        );
    }
}

// Add liked song
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
        const { videoId, title, artist, thumbnail, duration } = body;

        if (!videoId || !title || !artist) {
            console.error("Missing required fields:", { videoId, title, artist, body });
            return NextResponse.json(
                { success: false, error: `Missing required fields. videoId: ${!!videoId}, title: ${!!title}, artist: ${!!artist}` },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if already liked
        const existing = await LikedSong.findOne({
            userId: session.user.id,
            videoId,
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: "Song already liked" },
                { status: 409 }
            );
        }

        const likedSong = await LikedSong.create({
            userId: session.user.id,
            videoId,
            title,
            artist,
            thumbnail: thumbnail || "/placeholder-album.png",
            duration: duration || "0:00",
        });

        return NextResponse.json({ success: true, data: likedSong });
    } catch (error: any) {
        console.error("Error adding liked song:", error);
        console.error("Error details:", error.message, error.stack);
        return NextResponse.json(
            { success: false, error: "Failed to add liked song", details: error.message },
            { status: 500 }
        );
    }
}

// Remove liked song
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const videoId = searchParams.get("videoId");

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "Video ID is required" },
                { status: 400 }
            );
        }

        await connectDB();

        await LikedSong.findOneAndDelete({
            userId: session.user.id,
            videoId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing liked song:", error);
        return NextResponse.json(
            { success: false, error: "Failed to remove liked song" },
            { status: 500 }
        );
    }
}
