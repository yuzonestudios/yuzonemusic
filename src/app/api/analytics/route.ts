import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UTMTracking from "@/models/UTMTracking";

interface TrackingPayload {
    sessionId: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    page: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
    timezone?: string;
    device?: "mobile" | "tablet" | "desktop";
    browser?: string;
    os?: string;
    userId?: string;
}

// Parse user agent to extract browser and OS
function parseUserAgent(userAgent: string): { browser: string; os: string } {
    let browser = "Unknown";
    let os = "Unknown";

    // Browser detection
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Edge")) browser = "Edge";
    else if (userAgent.includes("Opera")) browser = "Opera";

    // OS detection
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad"))
        os = "iOS";
    else if (userAgent.includes("Android")) os = "Android";

    return { browser, os };
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as TrackingPayload;

        // Validate required fields
        if (!body.sessionId || !body.page) {
            return NextResponse.json(
                { error: "Missing required fields: sessionId and page" },
                { status: 400 }
            );
        }

        await connectDB();

        // Parse user agent if provided
        let browserInfo: { browser?: string; os?: string } = { browser: undefined, os: undefined };
        if (body.userAgent) {
            browserInfo = parseUserAgent(body.userAgent);
        }

        // Create new UTM tracking record
        const trackingRecord = await UTMTracking.create({
            userId: body.userId,
            sessionId: body.sessionId,
            source: body.utm_source,
            medium: body.utm_medium,
            campaign: body.utm_campaign,
            content: body.utm_content,
            term: body.utm_term,
            page: body.page,
            referrer: body.referrer,
            userAgent: body.userAgent,
            ipAddress: body.ipAddress,
            timezone: body.timezone,
            device: body.device,
            browser: body.browser || browserInfo.browser,
            os: body.os || browserInfo.os,
            timestamp: new Date(),
        });

        return NextResponse.json(
            {
                success: true,
                message: "Tracking data recorded successfully",
                trackingId: trackingRecord._id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("UTM Tracking Error:", error);
        return NextResponse.json(
            { error: "Failed to record tracking data" },
            { status: 500 }
        );
    }
}

// GET endpoint for analytics data (protected)
export async function GET(request: NextRequest) {
    try {
        // Check if user is authorized (could add auth check here)
        const searchParams = request.nextUrl.searchParams;
        const source = searchParams.get("source");
        const days = parseInt(searchParams.get("days") || "7");

        await connectDB();

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const query: any = {
            timestamp: { $gte: startDate },
        };

        if (source) {
            query.source = source;
        }

        const analytics = await UTMTracking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        source: "$source",
                        medium: "$medium",
                        campaign: "$campaign",
                    },
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$userId" },
                    uniqueSessions: { $addToSet: "$sessionId" },
                },
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    uniqueUsers: { $size: "$uniqueUsers" },
                    uniqueSessions: { $size: "$uniqueSessions" },
                },
            },
            { $sort: { count: -1 } },
        ]);

        // Get device breakdown
        const deviceBreakdown = await UTMTracking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$device",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        // Get top pages
        const topPages = await UTMTracking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$page",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        // Get browser breakdown
        const browserBreakdown = await UTMTracking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$browser",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        return NextResponse.json({
            success: true,
            data: {
                analytics,
                deviceBreakdown,
                topPages,
                browserBreakdown,
                timeRange: {
                    start: startDate,
                    end: new Date(),
                    days,
                },
            },
        });
    } catch (error) {
        console.error("Analytics Fetch Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics data" },
            { status: 500 }
        );
    }
}
