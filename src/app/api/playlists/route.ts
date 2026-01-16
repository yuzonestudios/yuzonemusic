import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Playlist from "@/models/Playlist";
import { cache, CACHE_TTL } from "@/lib/cache";

// GET - Fetch all playlists for the authenticated user OR a single playlist by ID
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

        // Check if requesting a single playlist
        const { searchParams } = new URL(req.url);
        const playlistId = searchParams.get("id");

        if (playlistId) {
            // Check cache first
            const cacheKey = `playlist:${user._id}:${playlistId}`;
            const cached = cache.get(cacheKey);
            if (cached) {
                return NextResponse.json(cached, {
                    headers: { 'X-Cache': 'HIT' }
                });
            }

            // Fetch single playlist
            const playlist = await Playlist.findOne({
                _id: playlistId,
                userId: user._id,
            }).lean();

            if (!playlist) {
                return NextResponse.json(
                    { success: false, error: "Playlist not found" },
                    { status: 404 }
                );
            }

            const response = {
                success: true,
                playlist: {
                    ...playlist,
                    _id: playlist._id.toString(),
                    userId: playlist.userId.toString(),
                    songCount: playlist.songs.length,
                },
            };

            // Cache the result
            cache.set(cacheKey, response, CACHE_TTL.PLAYLISTS);

            return NextResponse.json(response, {
                headers: { 'X-Cache': 'MISS' }
            });
        }

        // Check cache for all playlists
        const allPlaylistsCacheKey = `playlists:${user._id}`;
        const cachedPlaylists = cache.get(allPlaylistsCacheKey);
        if (cachedPlaylists) {
            return NextResponse.json(cachedPlaylists, {
                headers: { 'X-Cache': 'HIT' }
            });
        }

        // Fetch all playlists
        const playlists = await Playlist.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .lean();

        const response = {
            success: true,
            playlists: playlists.map(playlist => ({
                ...playlist,
                _id: playlist._id.toString(),
                userId: playlist.userId.toString(),
                songCount: playlist.songs.length,
            })),
        };

        // Cache the result
        cache.set(allPlaylistsCacheKey, response, CACHE_TTL.PLAYLISTS);

        return NextResponse.json(response, {
            headers: { 'X-Cache': 'MISS' }
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

        // Invalidate cache when creating new playlist
        cache.delete(`playlists:${user._id}`);

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

        // Invalidate cache when deleting playlist
        cache.delete(`playlists:${user._id}`);
        cache.delete(`playlist:${user._id}:${playlistId}`);

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
