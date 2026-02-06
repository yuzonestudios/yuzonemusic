import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

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

                    await sendVerificationEmail(email, name, `${siteUrl}/verify?token=${token}`);

                    return NextResponse.json({
                        success: true,
                        message: "Verification email sent.",
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

            await sendVerificationEmail(email, name, `${siteUrl}/verify?token=${token}`);

            return NextResponse.json({ success: true, message: "Verification email sent.", code: "VERIFICATION_SENT" });
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
            await sendVerificationEmail(email, name, `${siteUrl}/verify?token=${token}`);
        } catch (error) {
            await User.deleteOne({ email });
            throw error;
        }

        return NextResponse.json({ success: true, message: "Verification email sent.", code: "VERIFICATION_SENT" });
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

function createVerificationToken() {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    return { token, tokenHash, expiresAt };
}

async function sendVerificationEmail(email: string, name: string, link: string) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "no-reply@yuzonemusic.com";

    if (!host || !port || !user || !pass) {
        throw new Error("SMTP configuration is missing");
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: "Verify your Yuzone account",
            text: `Hi ${name || "there"},\n\nPlease verify your email by clicking the link below:\n${link}\n\nIf you didn\'t request this, you can ignore this email.`,
            html: `<p>Hi ${name || "there"},</p><p>Please verify your email by clicking the link below:</p><p><a href="${link}">Verify my email</a></p><p>If you didn\'t request this, you can ignore this email.</p>`,
        });
    } catch (error) {
        console.error("SMTP send error:", error);
        throw new Error("SMTP send failed");
    }
}
