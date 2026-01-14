"use client";

import { usePlayerStore } from "@/store/playerStore";
import styles from "./LoadingOverlay.module.css";

export default function LoadingOverlay() {
    const { isLoading, loadingMessage } = usePlayerStore();

    if (!isLoading) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className={styles.spinner}>
                    <div className={styles.spinnerTrack} />
                    <div className={styles.spinnerIndicator} />
                </div>
                {loadingMessage && <p className={styles.message}>{loadingMessage}</p>}
            </div>
        </div>
    );
}
