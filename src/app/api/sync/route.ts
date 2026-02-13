import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Simplified Listening Time Sync API
 * 
 * Stores currentTime for each song (by videoId) directly in user document
 * Automatically cleans up entries older than 30 days
 * 
 * Features:
 * - GET: Fetch listening time for current song
 * - POST: Save/update listening time for a song
 */

// GET: Fetch listening time for a specific song
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "videoId is required" },
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

        const listenData = user.monthlyListenTimes?.get(videoId);
        
        if (!listenData) {
            return NextResponse.json({
                success: true,
                currentTime: 0,
                message: "No saved time for this song",
            });
        }

        // Check if data is stale (older than 30 days)
        const daysSinceUpdate = (Date.now() - new Date(listenData.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 30) {
            return NextResponse.json({
                success: true,
                currentTime: 0,
                message: "Saved time expired",
            });
        }

        return NextResponse.json({
            success: true,
            currentTime: listenData.currentTime,
            lastUpdated: listenData.lastUpdated,
        });
    } catch (error) {
        console.error("Error fetching listening time:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch listening time" },
            { status: 500 }
        );
    }
}

// POST: Save/update listening time for a song
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
        const { videoId, currentTime } = body;

        // Validate required fields
        if (!videoId || typeof currentTime !== "number") {
            return NextResponse.json(
                { success: false, error: "videoId and currentTime are required" },
                { status: 400 }
            );
        }

        // Don't save if time is 0 or negative
        if (currentTime <= 0) {
            return NextResponse.json({
                success: true,
                message: "Time is 0, not saved",
            });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Initialize monthlyListenTimes if it doesn't exist
        if (!user.monthlyListenTimes) {
            user.monthlyListenTimes = new Map();
        }

        // Clean up old entries (older than 30 days) before saving
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        for (const [key, value] of user.monthlyListenTimes.entries()) {
            if (new Date(value.lastUpdated) < thirtyDaysAgo) {
                user.monthlyListenTimes.delete(key);
            }
        }

        // Update or set the listening time for this song
        user.monthlyListenTimes.set(videoId, {
            currentTime,
            lastUpdated: new Date(),
        });

        // Mark the Map field as modified for Mongoose
        user.markModified('monthlyListenTimes');
        await user.save();

        return NextResponse.json({
            success: true,
            message: "Listening time saved successfully",
        });
    } catch (error) {
        console.error("Error saving listening time:", error);
        return NextResponse.json(
            { success: false, error: "Failed to save listening time" },
            { status: 500 }
        );
    }
}
