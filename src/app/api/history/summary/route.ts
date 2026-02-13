import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PlaybackHistory from "@/models/PlaybackHistory";
import User from "@/models/User";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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

        const [summary] = await PlaybackHistory.aggregate([
            {
                $match: {
                    userId,
                    playedAt: { $gte: monthStart },
                },
            },
            {
                $group: {
                    _id: null,
                    totalListenSeconds: { $sum: "$listenDuration" },
                    plays: { $sum: 1 },
                },
            },
        ]);

        const totalListenSeconds = summary?.totalListenSeconds || 0;
        const hours = totalListenSeconds / 3600;
        const minutes = totalListenSeconds / 60;

        // Get user's total all-time listening time
        const user = await User.findById(userId).select("totalListeningTime").lean();
        const totalAllTimeSeconds = user?.totalListeningTime || 0;
        const allTimeHours = totalAllTimeSeconds / 3600;
        const allTimeMinutes = totalAllTimeSeconds / 60;

        return NextResponse.json({
            success: true,
            monthStart: monthStart.toISOString(),
            totalListenSeconds,
            totalListenHours: Math.round(hours * 100) / 100,
            totalListenMinutes: Math.round(minutes),
            plays: summary?.plays || 0,
            // All-time stats
            totalAllTimeSeconds,
            totalAllTimeHours: Math.round(allTimeHours * 100) / 100,
            totalAllTimeMinutes: Math.round(allTimeMinutes),
        });
    } catch (error) {
        console.error("Error fetching history summary:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch history summary" },
            { status: 500 }
        );
    }
}
