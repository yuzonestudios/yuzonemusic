import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Playlist from "@/models/Playlist";

// GET - Fetch all playlists for the authenticated user
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
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

        const playlists = await Playlist.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            playlists: playlists.map(playlist => ({
                ...playlist,
                _id: playlist._id.toString(),
                userId: playlist.userId.toString(),
                songCount: playlist.songs.length,
            })),
        });
    } catch (error) {
        console.error("Error fetching playlists:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch playlists" },
            { status: 500 }
        );
    }
}

// POST - Create a new playlist
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { name, description } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json(
                { success: false, error: "Playlist name is required" },
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

        const playlist = await Playlist.create({
            userId: user._id,
            name: name.trim(),
            description: description?.trim() || "",
            songs: [],
        });

        return NextResponse.json({
            success: true,
            playlist: {
                ...playlist.toObject(),
                _id: playlist._id.toString(),
                userId: playlist.userId.toString(),
                songCount: 0,
            },
        });
    } catch (error) {
        console.error("Error creating playlist:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create playlist" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a playlist
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const playlistId = searchParams.get("id");

        if (!playlistId) {
            return NextResponse.json(
                { success: false, error: "Playlist ID is required" },
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

        const result = await Playlist.findOneAndDelete({
            _id: playlistId,
            userId: user._id,
        });

        if (!result) {
            return NextResponse.json(
                { success: false, error: "Playlist not found or unauthorized" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Playlist deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting playlist:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete playlist" },
            { status: 500 }
        );
    }
}
