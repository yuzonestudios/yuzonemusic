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
                    console.log("DEBUG: SignIn started for:", user.email);
                    console.log("DEBUG: Google ID:", account.providerAccountId);

                    await connectDB();
                    console.log("DEBUG: DB Connected");

                    const existingUser = await User.findOne({ googleId: account.providerAccountId });
                    console.log("DEBUG: Existing User found:", !!existingUser);

                    if (!existingUser) {
                        console.log("DEBUG: Creating new user...");
                        const newUser = await User.create({
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            googleId: account.providerAccountId,
                        });
                        console.log("DEBUG: User created successfully:", newUser._id);
                    } else {
                        console.log("DEBUG: Updating existing user...");
                        await User.findOneAndUpdate(
                            { googleId: account.providerAccountId },
                            {
                                name: user.name,
                                image: user.image,
                            }
                        );
                        console.log("DEBUG: User updated");
                    }

                    return true;
                } catch (error) {
                    console.error("CRITICAL ERROR during sign in:", error);
                    // Check if it's a MongoDB connection error
                    if (error instanceof Error) {
                        console.error("Stack:", error.stack);
                    }
                    // IMPORTANT: Fail login if user creation/update fails.
                    // This prevents "token without DB user" state.
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

                    // If user is not found in database (even if they have a valid token),
                    // invalidate the session to force re-login/registration.
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
                    // Invalidate on error to be safe or keep logged in? 
                    // To be safe and strict as requested:
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
