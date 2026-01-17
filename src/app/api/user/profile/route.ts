import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// GET - Get user profile
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
        const user = await User.findOne({ email: session.user.email }).lean();
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                name: user.name,
                displayName: user.displayName || user.name,
                email: user.email,
                image: user.image,
                audioQuality: user.audioQuality || 2,
            },
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch user profile" },
            { status: 500 }
        );
    }
}

// PATCH - Update user profile
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { displayName, audioQuality } = body;

        // Validate displayName if provided
        if (displayName !== undefined) {
            if (typeof displayName !== "string") {
                return NextResponse.json(
                    { success: false, error: "Display name must be a string" },
                    { status: 400 }
                );
            }
            const trimmedName = displayName.trim();
            if (trimmedName.length < 2 || trimmedName.length > 50) {
                return NextResponse.json(
                    { success: false, error: "Display name must be between 2 and 50 characters" },
                    { status: 400 }
                );
            }
        }

        // Validate audioQuality if provided
        if (audioQuality !== undefined) {
            if (![1, 2, 3].includes(audioQuality)) {
                return NextResponse.json(
                    { success: false, error: "Audio quality must be 1, 2, or 3" },
                    { status: 400 }
                );
            }
        }

        // Build update object with provided fields
        const updateData: any = {};
        if (displayName !== undefined) {
            updateData.displayName = displayName.trim();
        }
        if (audioQuality !== undefined) {
            updateData.audioQuality = audioQuality;
        }

        // Ensure at least one field is being updated
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: "No fields to update" },
                { status: 400 }
            );
        }

        await connectDB();
        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            updateData,
            { new: true }
        );

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                name: user.name,
                displayName: user.displayName || user.name,
                email: user.email,
                audioQuality: user.audioQuality || 2,
            },
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update user profile" },
            { status: 500 }
        );
    }
}
