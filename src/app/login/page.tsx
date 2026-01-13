"use client";

import { signIn } from "next-auth/react";
import styles from "./login.module.css";

export default function LoginPage() {
    const handleGoogleSignIn = () => {
        signIn("google", { callbackUrl: "/dashboard" });
    };

    return (
        <div className={styles.container}>
            <div className={styles.background}></div>

            <div className={styles.card}>
                <div className={styles.logo}>
                    <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
                        <defs>
                            <linearGradient id="loginLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                        </defs>
                        <circle cx="16" cy="16" r="14" fill="url(#loginLogoGradient)" />
                        <path d="M12 10v12l10-6z" fill="white" />
                    </svg>
                </div>

                <h1 className={styles.title}>Welcome to Yuzone</h1>
                <p className={styles.subtitle}>Stream millions of songs for free</p>

                <button onClick={handleGoogleSignIn} className={styles.googleBtn}>
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
                    <span>Continue with Google</span>
                </button>

                <p className={styles.terms}>
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>

            <div className={styles.features}>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>🎵</div>
                    <span>Millions of Songs</span>
                </div>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>🎧</div>
                    <span>High Quality Audio</span>
                </div>
                <div className={styles.feature}>
                    <div className={styles.featureIcon}>❤️</div>
                    <span>Save Your Favorites</span>
                </div>
            </div>
        </div>
    );
}
