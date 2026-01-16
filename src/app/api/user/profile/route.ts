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
        const { displayName } = body;

        if (!displayName || typeof displayName !== "string") {
            return NextResponse.json(
                { success: false, error: "Display name is required" },
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

        await connectDB();
        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            { displayName: trimmedName },
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
