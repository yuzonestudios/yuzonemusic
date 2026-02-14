import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

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

        // Get user's total all-time listening time
        const user = await User.findById(userId).select("totalListeningTime").lean();
        const totalAllTimeSeconds = user?.totalListeningTime || 0;
        const allTimeHours = totalAllTimeSeconds / 3600;
        const allTimeMinutes = totalAllTimeSeconds / 60;

        const totalListenSeconds = totalAllTimeSeconds;
        const hours = allTimeHours;
        const minutes = allTimeMinutes;

        return NextResponse.json({
            success: true,
            totalListenSeconds,
            totalListenHours: Math.round(hours * 100) / 100,
            totalListenMinutes: Math.round(minutes),
            // All-time stats
            totalAllTimeSeconds,
            totalAllTimeHours: Math.round(allTimeHours * 100) / 100,
            totalAllTimeMinutes: Math.round(allTimeMinutes),
        }, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
        });
    } catch (error) {
        console.error("Error fetching history summary:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch history summary" },
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                },
            }
        );
    }
}
