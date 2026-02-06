import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const code = typeof body?.code === "string" ? body.code.trim() : "";

        if (!email || !code) {
            return NextResponse.json(
                { success: false, error: "Email and code are required." },
                { status: 400 }
            );
        }

        await connectDB();

        const tokenHash = crypto.createHash("sha256").update(code).digest("hex");
        const user = await User.findOne({
            email,
            emailVerificationToken: tokenHash,
            emailVerificationExpires: { $gt: new Date() },
        }).select("+emailVerificationToken");

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired code." },
                { status: 400 }
            );
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        return NextResponse.json({ success: true, message: "Email verified successfully." });
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.json(
            { success: false, error: "Verification failed." },
            { status: 500 }
        );
    }
}
