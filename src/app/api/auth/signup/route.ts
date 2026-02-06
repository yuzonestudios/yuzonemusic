import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

        const existingUser = await User.findOne({ email }).select("+passwordHash");
        if (existingUser) {
            if (existingUser.passwordHash) {
                return NextResponse.json(
                    { success: false, error: "An account with this email already exists." },
                    { status: 409 }
                );
            }

            const passwordHash = await bcrypt.hash(password, 12);
            existingUser.passwordHash = passwordHash;
            existingUser.providers = Array.from(new Set([...(existingUser.providers || []), "credentials"]));
            if (!existingUser.name) {
                existingUser.name = name;
            }
            await existingUser.save();

            return NextResponse.json({ success: true, message: "Account created." });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await User.create({
            name,
            displayName: name,
            email,
            passwordHash,
            providers: ["credentials"],
        });

        return NextResponse.json({ success: true, message: "Account created." });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create account." },
            { status: 500 }
        );
    }
}
