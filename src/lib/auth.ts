import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import connectDB from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = credentials?.email?.toLowerCase().trim();
                const password = credentials?.password;

                if (!email || !password) {
                    return null;
                }

                await connectDB();

                const user = await User.findOne({ email }).select("+passwordHash +emailVerified");
                if (!user?.passwordHash) {
                    return null;
                }

                if (user.emailVerified === false) {
                    return null;
                }

                const isValid = await bcrypt.compare(password, user.passwordHash);
                if (!isValid) {
                    return null;
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    image: user.image,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                try {
                    await connectDB();

                    // ATOMIC UPSERT: Handles both "Create" and "Update" in one optimized DB call.
                    // This creates the user if they don't exist, or updates them if they do.
                    // Completely eliminates "Duplicate Key" race conditions.
                    await User.findOneAndUpdate(
                        { googleId: account.providerAccountId },
                        {
                            $set: {
                                name: user.name,
                                image: user.image,
                                email: user.email,
                                emailVerified: true,
                            },
                            $unset: {
                                emailVerificationToken: "",
                                emailVerificationExpires: "",
                            },
                            $setOnInsert: {
                                googleId: account.providerAccountId,
                            },
                            $addToSet: {
                                providers: "google",
                            }
                        },
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                            runValidators: true
                        }
                    );

                    return true;
                } catch (error: any) {
                    console.error("CRITICAL ERROR during sign in:", error);

                    // Mongoose Validation Error (e.g. missing required field)
                    if (error.name === "ValidationError") {
                        console.error("Validation Error Details:", error.errors);
                        return false;
                    }

                    if (error instanceof Error) {
                        console.error("Stack:", error.stack);

                        // Strict check: if connection fails, user cannot login.
                        if (error.name === "MongooseServerSelectionError") {
                            console.error("\n\n!!! MONGODB CONNECTION FAILED !!!");
                            console.error("Your IP address is likely not whitelisted in MongoDB Atlas.");
                            console.error("Please go to Network Access -> Add IP Address -> Add Current IP.\n\n");
                        }
                    }

                    return false;
                }
            }
            if (account?.provider === "credentials") {
                return true;
            }
            return true;
        },
        async session({ session, token }) {
            if (session.user) {
                try {
                    await connectDB();

                    // Prefer cached uid set in JWT
                    if (token.uid) {
                        session.user.id = token.uid as string;
                        // Fetch displayName from DB
                        const dbUser = await User.findOne({ _id: token.uid });
                        if (dbUser) {
                            (session.user as any).displayName = dbUser.displayName || dbUser.name;
                        }
                        return session;
                    }

                    // Fallback: lookup by id (token.sub) or googleId
                    if (token.sub) {
                        let dbUser = null;
                        if (isValidObjectId(token.sub)) {
                            dbUser = await User.findOne({ _id: token.sub });
                        }
                        if (!dbUser) {
                            dbUser = await User.findOne({ googleId: token.sub });
                        }

                        if (!dbUser) {
                            console.error("CRITICAL: User not found in DB during session check!", token.sub);
                            return { ...session, user: undefined as any };
                        }

                        session.user.id = dbUser._id.toString();
                        (session.user as any).displayName = dbUser.displayName || dbUser.name;
                    }
                } catch (error) {
                    console.error("Error fetching user in session:", error);
                    return { ...session, user: undefined as any };
                }
            }
            return session;
        },
        async jwt({ token, account, user }) {
            try {
                await connectDB();

                // On first sign-in, account is present
                if (account?.provider === "google" && account.providerAccountId) {
                    const dbUser = await User.findOne({ googleId: account.providerAccountId });
                    if (dbUser) {
                        token.uid = dbUser._id.toString();
                    }
                    token.sub = account.providerAccountId;
                    return token;
                }

                if (account?.provider === "credentials" && user?.id) {
                    token.uid = user.id as string;
                    token.sub = user.id as string;
                    return token;
                }

                // For subsequent requests, ensure uid is set
                if (!token.uid && token.sub) {
                    let dbUser = null;
                    if (isValidObjectId(token.sub)) {
                        dbUser = await User.findOne({ _id: token.sub });
                    }
                    if (!dbUser) {
                        dbUser = await User.findOne({ googleId: token.sub });
                    }
                    if (dbUser) {
                        token.uid = dbUser._id.toString();
                    }
                }
            } catch (error) {
                console.error("JWT callback error:", error);
            }
            return token;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
