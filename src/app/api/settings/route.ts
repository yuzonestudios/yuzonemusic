import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
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

        await connectDB();
        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                theme: user.theme || "cyber-blue",
                animationTheme: user.animationTheme || "still",
                customThemeImage: user.customThemeImage || null,
            },
        });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { theme, animationTheme, customThemeImage } = body;

        if (!theme && !animationTheme && customThemeImage === undefined) {
            return NextResponse.json(
                { success: false, error: "No settings provided" },
                { status: 400 }
            );
        }

        await connectDB();
        const updateData: any = {};

        if (theme) {
            updateData.theme = theme;
        }

        if (animationTheme) {
            updateData.animationTheme = animationTheme;
        }

        if (customThemeImage !== undefined) {
            if (customThemeImage !== null && typeof customThemeImage !== "string") {
                return NextResponse.json(
                    { success: false, error: "Custom theme image must be a string or null" },
                    { status: 400 }
                );
            }
            if (typeof customThemeImage === "string" && customThemeImage.length > 1_500_000) {
                return NextResponse.json(
                    { success: false, error: "Custom theme image is too large" },
                    { status: 400 }
                );
            }
            updateData.customThemeImage = customThemeImage ? customThemeImage.trim() : null;
        }

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
            data: {
                theme: user.theme || "cyber-blue",
                animationTheme: user.animationTheme || "still",
                customThemeImage: user.customThemeImage || null,
            },
        });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
