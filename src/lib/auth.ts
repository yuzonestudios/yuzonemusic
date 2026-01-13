import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                try {
                    await connectDB();

                    const existingUser = await User.findOne({ googleId: account.providerAccountId });

                    if (!existingUser) {
                        await User.create({
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            googleId: account.providerAccountId,
                        });
                    } else {
                        // Update user info on each login
                        await User.findOneAndUpdate(
                            { googleId: account.providerAccountId },
                            {
                                name: user.name,
                                image: user.image,
                            }
                        );
                    }

                    return true;
                } catch (error) {
                    console.error("Error during sign in:", error);
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
                    if (dbUser) {
                        session.user.id = dbUser._id.toString();
                    }
                } catch (error) {
                    console.error("Error fetching user in session:", error);
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
