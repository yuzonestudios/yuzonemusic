import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Share from "@/models/Share";
import Playlist from "@/models/Playlist";
import { getSongInfo } from "@/lib/youtube-music";

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
            // Try to fetch song metadata for a nicer shared view
            let songData = null;
            try {
                songData = await getSongInfo(share.contentId);
            } catch (err) {
                console.error("Failed to fetch song info for shared link", err);
            }

            return NextResponse.json({
                success: true,
                content: {
                    type: "song",
                    data: songData || {
                        videoId: share.contentId,
                        title: "Unknown Title",
                        artist: "Unknown Artist",
                        thumbnail: "/placeholder-album.png",
                        duration: "",
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
