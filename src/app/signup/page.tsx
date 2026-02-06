"use client";

import { signIn } from "next-auth/react";
import { Music } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import styles from "./signup.module.css";

function SignupClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGooglePrompt, setShowGooglePrompt] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSignup = async (event: FormEvent) => {
        event.preventDefault();
        if (isSubmitting || isGoogleLoading) {
            return;
        }
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            setIsSubmitting(false);
            if (data?.code === "GOOGLE_LINKED") {
                setShowGooglePrompt(true);
                return;
            }
            setError(data?.error || "Failed to create account.");
            return;
        }
        setIsSubmitting(false);
        setVerificationSent(true);
        return;
    };

    const handleVerify = async () => {
        if (isVerifying || !verificationCode.trim()) {
            return;
        }
        setError(null);
        setIsVerifying(true);
        try {
            const response = await fetch("/api/auth/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), code: verificationCode.trim() }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                router.push("/login?verified=true");
            } else {
                setError(data.error || "Invalid or expired code.");
            }
        } catch (err) {
            setError("Verification failed.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleGoogleSignIn = () => {
        if (isGoogleLoading || isSubmitting) {
            return;
        }
        setIsGoogleLoading(true);
        signIn("google", { callbackUrl });
    };

    return (
        <div className={styles.container}>
            <div className={styles.background}></div>

            <div className={styles.card}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}><Music size={32} /></div>
                </div>

                <h1 className={styles.title}>Create your account</h1>
                <p className={styles.subtitle}>Join Yuzone and start streaming</p>

                <form className={styles.form} onSubmit={handleSignup}>
                    <label className={styles.label} htmlFor="name">Full name</label>
                    <input
                        id="name"
                        type="text"
                        className={styles.input}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Jane Doe"
                        autoComplete="name"
                        required
                    />

                    <label className={styles.label} htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        className={styles.input}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                    />

                    <label className={styles.label} htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        className={styles.input}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        required
                    />

                    <label className={styles.label} htmlFor="confirmPassword">Confirm password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className={styles.input}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        required
                    />

                    {error ? <p className={styles.error}>{error}</p> : null}

                    <button
                        type="submit"
                        className={styles.primaryBtn}
                        disabled={isSubmitting || isGoogleLoading || verificationSent}
                    >
                        {verificationSent ? "Check your email" : isSubmitting ? "Creating account..." : "Create account"}
                    </button>
                </form>

                {verificationSent && (
                    <div className={styles.verificationSection}>
                        <p className={styles.successMessage}>
                            A 6-digit code has been sent to your email.
                        </p>
                        <label className={styles.label} htmlFor="verificationCode">Verification Code</label>
                        <input
                            id="verificationCode"
                            type="text"
                            className={styles.input}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            required
                        />
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={handleVerify}
                            disabled={isVerifying || verificationCode.length !== 6}
                        >
                            {isVerifying ? "Verifying..." : "Verify Email"}
                        </button>
                    </div>
                )}

                <div className={styles.divider}>
                    <span>or</span>
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    className={styles.googleBtn}
                    disabled={isGoogleLoading || isSubmitting || verificationSent}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    <span>{isGoogleLoading ? "Redirecting..." : "Continue with Google"}</span>
                </button>

                <p className={styles.terms}>
                    By creating an account, you agree to our Terms of Service and Privacy Policy.
                </p>

                <p className={styles.switchAuth}>
                    Already have an account? <a href="/login">Sign in</a>
                </p>
            </div>

            {showGooglePrompt && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Use Google to sign in</h2>
                        <p className={styles.modalText}>
                            This email is already linked with Google. Please continue with Google to access your account.
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.primaryBtn}
                                onClick={handleGoogleSignIn}
                                disabled={isGoogleLoading || isSubmitting}
                            >
                                {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
                            </button>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setShowGooglePrompt(false)}
                                disabled={isGoogleLoading || isSubmitting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense>
            <SignupClient />
        </Suspense>
    );
}
