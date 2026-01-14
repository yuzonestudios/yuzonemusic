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
            return true;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                try {
                    await connectDB();
                    const dbUser = await User.findOne({ googleId: token.sub });

                    // Strict verification: User MUST be in DB
                    if (!dbUser) {
                        console.error("CRITICAL: User not found in DB during session check!", token.sub);
                        return {
                            ...session,
                            user: undefined as any // Force invalid user
                        };
                    }

                    if (dbUser) {
                        session.user.id = dbUser._id.toString();
                    }
                } catch (error) {
                    console.error("Error fetching user in session:", error);
                    // Fail securely
                    return {
                        ...session,
                        user: undefined as any
                    };
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
