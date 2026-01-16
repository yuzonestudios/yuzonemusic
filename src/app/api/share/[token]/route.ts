import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Share from "@/models/Share";
import Playlist from "@/models/Playlist";

// GET - Access shared content without authentication
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Share token is required" },
                { status: 400 }
            );
        }

        await connectDB();

        // Find share
        const share = await Share.findOne({ shareToken: token });

        if (!share) {
            return NextResponse.json(
                { success: false, error: "Share not found or expired" },
                { status: 404 }
            );
        }

        // Check if share has expired
        if (share.expiresAt && new Date() > share.expiresAt) {
            return NextResponse.json(
                { success: false, error: "Share link has expired" },
                { status: 410 }
            );
        }

        // Increment view count
        share.viewCount += 1;
        await share.save();

        // Get shared content
        if (share.contentType === "playlist") {
            const playlist = await Playlist.findById(share.contentId).lean();

            if (!playlist) {
                return NextResponse.json(
                    { success: false, error: "Playlist not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                content: {
                    type: "playlist",
                    data: {
                        _id: playlist._id.toString(),
                        name: playlist.name,
                        description: playlist.description,
                        thumbnail: playlist.thumbnail,
                        songs: playlist.songs,
                        songCount: playlist.songs.length,
                        createdAt: playlist.createdAt,
                        updatedAt: playlist.updatedAt,
                    },
                },
                viewCount: share.viewCount,
            });
        } else if (share.contentType === "song") {
            // For songs, we return the song metadata
            // In a full implementation, you'd fetch this from your database or cache
            return NextResponse.json({
                success: true,
                content: {
                    type: "song",
                    data: {
                        videoId: share.contentId,
                    },
                },
                viewCount: share.viewCount,
            });
        }

        return NextResponse.json(
            { success: false, error: "Invalid content type" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error accessing shared content:", error);
        return NextResponse.json(
            { success: false, error: "Failed to access shared content" },
            { status: 500 }
        );
    }
}
