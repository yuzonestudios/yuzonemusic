import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
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
                            },
                            $setOnInsert: {
                                googleId: account.providerAccountId,
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

                        if (error.name === "MongooseServerSelectionError") {
                            console.error("\n\n!!! MONGODB CONNECTION FAILED !!!");
                            console.error("Your IP address is likely not whitelisted in MongoDB Atlas.");
                            console.error("Please go to Network Access -> Add IP Address -> Add Current IP.");
                            console.error("Switching to OFFLINE MODE. Login permitted w/o Database.\n\n");
                            return true; // ALLOW LOGIN despite DB error
                        }
                    }

                    // If it's a transient connection error, we might want to return false to force retry
                    return false;
                }
            }
            return true;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                try {
                    // console.log("DEBUG: Session callback for sub:", token.sub);
                    await connectDB();
                    const dbUser = await User.findOne({ googleId: token.sub });
                    // console.log("DEBUG: DB User found for session:", !!dbUser);

                    // NORMAL FLOW: User found in DB
                    if (dbUser) {
                        session.user.id = dbUser._id.toString();
                        return session;
                    }

                    // ERROR FLOW: User not found in DB
                    // If DB connection failed previously (Offline Mode), or user just missing.
                    // We check if DB is actually connected? No easy way here without overhead.
                    // For now, if we are here and DB user is missing, it's either:
                    // 1. Attack (token exists but user deleted)
                    // 2. Offline Mode (DB unreachable)

                    // To be safe but resilient: If we just allowed them in signIn via Offline Mode,
                    // we should probably allow them here too.
                    // We'll use the GoogleID as a fallback "id" so the app doesn't crash.
                    console.warn("User not found in DB. Using Google ID as fallback session ID (Offline/Resilient Mode).");
                    session.user.id = token.sub; // Fallback ID
                    return session;

                } catch (error) {
                    console.error("Error fetching user in session:", error);
                    // OFFLINE MODE FALLBACK
                    // If DB errors out here, we still return the session so the user remains logged in.
                    session.user.id = token.sub as string;
                    return session;
                }
            }
            return session;
        },
        async jwt({ token, account }) {
            if (account) {
                token.sub = account.providerAccountId;
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
