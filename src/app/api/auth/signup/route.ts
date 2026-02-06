import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createVerificationToken, sendVerificationEmail } from "@/lib/email";

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";

        if (!name || !email || !password) {
            return NextResponse.json(
                { success: false, error: "Name, email, and password are required." },
                { status: 400 }
            );
        }

        if (!isValidEmail(email)) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { success: false, error: "Password must be at least 8 characters." },
                { status: 400 }
            );
        }

        await connectDB();

        const existingUser = await User.findOne({ email }).select("+passwordHash +emailVerified +emailVerificationToken +emailVerificationExpires");
        if (existingUser) {
            if (existingUser.passwordHash) {
                if (existingUser.emailVerified === false) {
                    const { token, tokenHash, expiresAt } = createVerificationToken();
                    existingUser.emailVerificationToken = tokenHash;
                    existingUser.emailVerificationExpires = expiresAt;
                    await existingUser.save();

                    await sendVerificationEmail(email, name, token);

                    return NextResponse.json({
                        success: true,
                        message: "Verification code sent to your email.",
                        code: "VERIFICATION_SENT",
                    });
                }
                return NextResponse.json(
                    { success: false, error: "An account with this email already exists." },
                    { status: 409 }
                );
            }

            if (existingUser.googleId || existingUser.providers?.includes("google")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "This email is linked with Google. Please sign in with Google.",
                        code: "GOOGLE_LINKED",
                    },
                    { status: 409 }
                );
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const { token, tokenHash, expiresAt } = createVerificationToken();
            existingUser.passwordHash = passwordHash;
            existingUser.providers = Array.from(new Set([...(existingUser.providers || []), "credentials"]));
            existingUser.emailVerified = false;
            existingUser.emailVerificationToken = tokenHash;
            existingUser.emailVerificationExpires = expiresAt;
            if (!existingUser.name) {
                existingUser.name = name;
            }
            await existingUser.save();

            await sendVerificationEmail(email, name, token);

            return NextResponse.json({ success: true, message: "Verification code sent to your email.", code: "VERIFICATION_SENT" });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const { token, tokenHash, expiresAt } = createVerificationToken();

        await User.create({
            name,
            displayName: name,
            email,
            passwordHash,
            providers: ["credentials"],
            emailVerified: false,
            emailVerificationToken: tokenHash,
            emailVerificationExpires: expiresAt,
        });

        try {
            await sendVerificationEmail(email, name, token);
        } catch (error) {
            await User.deleteOne({ email });
            throw error;
        }

        return NextResponse.json({ success: true, message: "Verification code sent to your email.", code: "VERIFICATION_SENT" });
    } catch (error) {
        console.error("Signup error:", error);
        const message = error instanceof Error && error.message ? error.message : "Failed to create account.";
        const safeMessage =
            message === "SMTP configuration is missing"
                ? message
                : message === "SMTP send failed"
                    ? "Unable to send verification email. Please check SMTP settings."
                    : "Failed to create account.";
        return NextResponse.json(
            { success: false, error: safeMessage },
            { status: 500 }
        );
    }
}
