import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import PlayerState from "@/models/PlayerState";

/**
 * Cross-Device Player Sync API
 * 
 * Enables seamless playback synchronization across multiple devices for a single user account.
 * 
 * Features:
 * - GET: Fetch the latest synced player state from the server
 * - POST: Save/sync current player state to the server
 * - DELETE: Clear synced player data for the current device
 * 
 * Synced Data:
 * - Current song and queue
 * - Playback position (currentTime)
 * - Volume and playback speed
 * - Repeat and shuffle settings
 * - Queue source information
 */

// Generate or get device ID from client
function getDeviceId(req: NextRequest): string {
    const deviceIdHeader = req.headers.get("x-device-id");
    if (deviceIdHeader) return deviceIdHeader;
    
    // Fallback: use user agent + a timestamp hash
    const userAgent = req.headers.get("user-agent") || "unknown";
    return Buffer.from(userAgent).toString("base64").substring(0, 32);
}

// GET: Fetch the latest synced player state
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

        // Get the most recent player state for this user
        const playerState = await PlayerState.findOne({ userId: user._id })
            .sort({ lastSyncedAt: -1 })
            .lean();

        if (!playerState) {
            return NextResponse.json({
                success: true,
                playerState: null,
                message: "No synced state found",
            });
        }

        return NextResponse.json({
            success: true,
            playerState: {
                currentSong: playerState.currentSong,
                queue: playerState.queue,
                queueIndex: playerState.queueIndex,
                queueSource: playerState.queueSource,
                currentTime: playerState.currentTime,
                volume: playerState.volume,
                repeat: playerState.repeat,
                shuffle: playerState.shuffle,
                playbackSpeed: playerState.playbackSpeed,
                lastSyncedAt: playerState.lastSyncedAt,
                deviceId: playerState.deviceId,
            },
        });
    } catch (error) {
        console.error("Error fetching player state:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch player state" },
            { status: 500 }
        );
    }
}

// POST: Save/sync player state to server
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const deviceId = getDeviceId(req);
        const body = await req.json();

        // Validate required fields
        if (!body.currentSong && !body.queue) {
            return NextResponse.json(
                { success: false, error: "Invalid player state data" },
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

        // Update or create player state
        const playerState = await PlayerState.findOneAndUpdate(
            { userId: user._id, deviceId },
            {
                userId: user._id,
                deviceId,
                currentSong: body.currentSong || null,
                queue: body.queue || [],
                queueIndex: body.queueIndex || 0,
                queueSource: body.queueSource || { type: null, id: null, name: null },
                currentTime: body.currentTime || 0,
                volume: body.volume ?? 0.7,
                repeat: body.repeat || "off",
                shuffle: body.shuffle || false,
                playbackSpeed: body.playbackSpeed || 1,
                lastSyncedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            message: "Player state synced successfully",
            lastSyncedAt: playerState.lastSyncedAt,
        });
    } catch (error) {
        console.error("Error syncing player state:", error);
        return NextResponse.json(
            { success: false, error: "Failed to sync player state" },
            { status: 500 }
        );
    }
}

// DELETE: Clear synced player state
export async function DELETE(req: NextRequest) {
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

        const deviceId = getDeviceId(req);
        await PlayerState.deleteMany({ userId: user._id, deviceId });

        return NextResponse.json({
            success: true,
            message: "Player state cleared successfully",
        });
    } catch (error) {
        console.error("Error clearing player state:", error);
        return NextResponse.json(
            { success: false, error: "Failed to clear player state" },
            { status: 500 }
        );
    }
}
