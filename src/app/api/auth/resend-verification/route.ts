import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createVerificationToken, sendVerificationEmail } from "@/lib/email";

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

        if (!email || !isValidEmail(email)) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        await connectDB();
        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json({ success: true, message: "If an account exists, a verification email has been sent." });
        }

        if (user.emailVerified) {
            return NextResponse.json({ success: true, message: "Email already verified." });
        }

        const { token, tokenHash, expiresAt } = createVerificationToken();
        user.emailVerificationToken = tokenHash;
        user.emailVerificationExpires = expiresAt;
        await user.save();

        await sendVerificationEmail(email, user.name || "there", token);

        return NextResponse.json({ success: true, message: "Verification email sent." });
    } catch (error) {
        console.error("Resend verification error:", error);
        const message = error instanceof Error && error.message ? error.message : "Failed to resend verification email.";
        const safeMessage =
            message === "SMTP configuration is missing"
                ? message
                : message === "SMTP send failed"
                    ? "Unable to send verification email. Please check SMTP settings."
                    : "Failed to resend verification email.";
        return NextResponse.json(
            { success: false, error: safeMessage },
            { status: 500 }
        );
    }
}
