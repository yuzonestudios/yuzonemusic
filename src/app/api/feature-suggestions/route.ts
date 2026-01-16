import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import FutureSuggestion from "@/models/FutureSuggestion";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { suggestion } = await req.json();
        const text = typeof suggestion === "string" ? suggestion.trim() : "";

        if (!text || text.length < 5 || text.length > 500) {
            return NextResponse.json(
                { success: false, error: "Suggestion must be between 5 and 500 characters." },
                { status: 400 }
            );
        }

        await connectDB();
        await FutureSuggestion.create({
            userEmail: session.user.email,
            userId: session.user.id || session.user.sub,
            suggestion: text,
        });

        return NextResponse.json({ success: true, message: "Thanks for the suggestion!" });
    } catch (error) {
        console.error("Error saving suggestion:", error);
        return NextResponse.json(
            { success: false, error: "Could not save suggestion. Please try again." },
            { status: 500 }
        );
    }
}
