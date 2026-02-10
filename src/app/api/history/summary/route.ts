import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PlaybackHistory from "@/models/PlaybackHistory";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        await connectDB();

        const [summary] = await PlaybackHistory.aggregate([
            {
                $match: {
                    userId: session.user.id,
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

        return NextResponse.json({
            success: true,
            monthStart: monthStart.toISOString(),
            totalListenSeconds,
            totalListenHours: Math.round(hours * 100) / 100,
            totalListenMinutes: Math.round(minutes),
            plays: summary?.plays || 0,
        });
    } catch (error) {
        console.error("Error fetching history summary:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch history summary" },
            { status: 500 }
        );
    }
}
