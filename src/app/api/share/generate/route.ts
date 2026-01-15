import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Share from "@/models/Share";
import { randomBytes } from "crypto";

function generateShareToken(): string {
    return randomBytes(16).toString("hex");
}

// POST - Generate a share link for a playlist or song
export async function POST(req: NextRequest) {
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

        const body = await req.json();
        const { contentType, contentId, expiresIn } = body;

        if (!contentType || !contentId) {
            return NextResponse.json(
                { success: false, error: "contentType and contentId are required" },
                { status: 400 }
            );
        }

        if (!["playlist", "song"].includes(contentType)) {
            return NextResponse.json(
                { success: false, error: "Invalid contentType" },
                { status: 400 }
            );
        }

        // Check if share already exists
        let share = await Share.findOne({
            userId: user._id,
            contentType,
            contentId,
        });

        if (share) {
            // Return existing share
            return NextResponse.json({
                success: true,
                share: {
                    _id: share._id.toString(),
                    shareToken: share.shareToken,
                    contentType: share.contentType,
                    contentId: share.contentId,
                    shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${share.shareToken}`,
                    viewCount: share.viewCount,
                    createdAt: share.createdAt,
                },
            });
        }

        // Create new share
        const shareToken = generateShareToken();
        let expiresAt = null;

        if (expiresIn) {
            const expiresInMs = parseInt(expiresIn) * 1000;
            expiresAt = new Date(Date.now() + expiresInMs);
        }

        share = await Share.create({
            userId: user._id,
            contentType,
            contentId,
            shareToken,
            expiresAt,
            viewCount: 0,
        });

        return NextResponse.json({
            success: true,
            share: {
                _id: share._id.toString(),
                shareToken: share.shareToken,
                contentType: share.contentType,
                contentId: share.contentId,
                shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${share.shareToken}`,
                viewCount: share.viewCount,
                createdAt: share.createdAt,
            },
        });
    } catch (error) {
        console.error("Error generating share link:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate share link" },
            { status: 500 }
        );
    }
}
