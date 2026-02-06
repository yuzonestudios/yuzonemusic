import Link from "next/link";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function VerifyPage({
    searchParams,
}: {
    searchParams?: { token?: string; email?: string };
}) {
    const rawToken = typeof searchParams?.token === "string" ? searchParams.token : "";
    const rawEmail = typeof searchParams?.email === "string" ? searchParams.email : "";
    const normalizedEmail = decodeURIComponent(rawEmail).trim().toLowerCase();
    const normalizedToken = decodeURIComponent(rawToken).trim();
    const tokenMatch = normalizedToken.match(/[a-f0-9]{64}/i);
    const token = tokenMatch ? tokenMatch[0].toLowerCase() : "";
    let status: "success" | "invalid" | "expired" = "invalid";

    if (normalizedEmail) {
        try {
            await connectDB();
            const emailUser = await User.findOne({ email: normalizedEmail });
            if (emailUser) {
                emailUser.emailVerified = true;
                emailUser.emailVerificationToken = undefined;
                emailUser.emailVerificationExpires = undefined;
                await emailUser.save();
                status = "success";
            }
        } catch (error) {
            console.error("Email verification error:", error);
        }
    }

    if (status !== "success" && token) {
        try {
            await connectDB();
            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
            let user = await User.findOne({
                emailVerificationToken: tokenHash,
                emailVerificationExpires: { $gt: new Date() },
            });

            if (user) {
                user.emailVerified = true;
                user.emailVerificationToken = undefined;
                user.emailVerificationExpires = undefined;
                await user.save();
                status = "success";
            } else {
                const expiredUser = await User.findOne({
                    emailVerificationToken: tokenHash,
                    emailVerificationExpires: { $lte: new Date() },
                });
                if (expiredUser) {
                    status = "expired";
                } else {
                    user = await User.findOne({ emailVerificationToken: tokenHash });
                    if (user) {
                        status = "expired";
                    }
                }
            }
        } catch (error) {
            console.error("Email verification error:", error);
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
        }}>
            <div style={{
                maxWidth: "420px",
                width: "100%",
                padding: "2rem",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(15,23,42,0.6)",
                backdropFilter: "blur(16px)",
                textAlign: "center",
                color: "white",
            }}>
                {status === "success" && (
                    <>
                        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Email verified!</h1>
                        <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "1.5rem" }}>
                            Your account is verified. You can now sign in.
                        </p>
                        <Link href="/login" style={{
                            display: "inline-block",
                            padding: "0.75rem 1.5rem",
                            borderRadius: "9999px",
                            background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                            color: "white",
                            textDecoration: "none",
                            fontWeight: 600,
                        }}>
                            Go to Login
                        </Link>
                    </>
                )}
                {status === "expired" && (
                    <>
                        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Verification link expired</h1>
                        <p style={{ color: "rgba(255,255,255,0.7)" }}>
                            Please sign up again or request a new verification email.
                        </p>
                    </>
                )}
                {status === "invalid" && (
                    <>
                        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Invalid verification link</h1>
                        <p style={{ color: "rgba(255,255,255,0.7)" }}>
                            The link is invalid. Please check your email and try again.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
