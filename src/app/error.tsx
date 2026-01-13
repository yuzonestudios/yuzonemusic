"use client";

import { useEffect } from "react";
import styles from "./error.module.css";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className={styles.container}>
            <div className={styles.icon}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
                An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
                <p className={styles.digest}>Error ID: {error.digest}</p>
            )}
            <button onClick={reset} className={styles.button}>
                Try Again
            </button>
        </div>
    );
}
