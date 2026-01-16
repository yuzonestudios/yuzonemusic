import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Playlist from "@/models/Playlist";
import { cache } from "@/lib/cache";

// POST - Add a song to playlist
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: playlistId } = await params;
        const body = await req.json();
        const { videoId, title, artist, thumbnail, duration } = body;

        if (!videoId || !title || !artist || !thumbnail || !duration) {
            return NextResponse.json(
                { success: false, error: "Missing song information" },
                { status: 400 }
            );
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Find playlist and verify ownership
        const playlist = await Playlist.findOne({
            _id: playlistId,
            userId: user._id,
        });

        if (!playlist) {
            return NextResponse.json(
                { success: false, error: "Playlist not found or unauthorized" },
                { status: 404 }
            );
        }

        // Check if song already exists in playlist
        const songExists = playlist.songs.some(
            (song) => song.videoId === videoId
        );

        if (songExists) {
            return NextResponse.json(
                { success: false, error: "Song already in playlist" },
                { status: 400 }
            );
        }

        // Add song to playlist
        playlist.songs.push({
            videoId,
            title,
            artist,
            thumbnail,
            duration,
            addedAt: new Date(),
        });

        // Update thumbnail if it's the first song
        if (playlist.songs.length === 1) {
            playlist.thumbnail = thumbnail;
        }

        await playlist.save();

        // Invalidate cache for this playlist and all playlists
        cache.delete(`playlist:${user._id}:${playlistId}`);
        cache.delete(`playlists:${user._id}`);

        return NextResponse.json({
            success: true,
            message: "Song added to playlist",
            playlist: {
                ...playlist.toObject(),
                _id: playlist._id.toString(),
                userId: playlist.userId.toString(),
                songCount: playlist.songs.length,
            },
        });
    } catch (error) {
        console.error("Error adding song to playlist:", error);
        return NextResponse.json(
            { success: false, error: "Failed to add song to playlist" },
            { status: 500 }
        );
    }
}

// DELETE - Remove a song from playlist
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: playlistId } = await params;
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "Video ID is required" },
                { status: 400 }
            );
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Find playlist and verify ownership
        const playlist = await Playlist.findOne({
            _id: playlistId,
            userId: user._id,
        });

        if (!playlist) {
            return NextResponse.json(
                { success: false, error: "Playlist not found or unauthorized" },
                { status: 404 }
            );
        }

        // Remove song from playlist
        const initialLength = playlist.songs.length;
        playlist.songs = playlist.songs.filter(
            (song) => song.videoId !== videoId
        );

        if (playlist.songs.length === initialLength) {
            return NextResponse.json(
                { success: false, error: "Song not found in playlist" },
                { status: 404 }
            );
        }

        // Update thumbnail if needed
        if (playlist.songs.length === 0) {
            playlist.thumbnail = undefined;
        } else if (playlist.thumbnail === playlist.songs[0]?.thumbnail) {
            // Update thumbnail to first song if we removed the song that was the thumbnail
            playlist.thumbnail = playlist.songs[0].thumbnail;
        }

        await playlist.save();

        // Invalidate cache for this playlist and all playlists
        cache.delete(`playlist:${user._id}:${playlistId}`);
        cache.delete(`playlists:${user._id}`);

        return NextResponse.json({
            success: true,
            message: "Song removed from playlist",
            playlist: {
                ...playlist.toObject(),
                _id: playlist._id.toString(),
                userId: playlist.userId.toString(),
                songCount: playlist.songs.length,
            },
        });
    } catch (error) {
        console.error("Error removing song from playlist:", error);
        return NextResponse.json(
            { success: false, error: "Failed to remove song from playlist" },
            { status: 500 }
        );
    }
}
