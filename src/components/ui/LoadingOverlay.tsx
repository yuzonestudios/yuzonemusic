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
                    {/* Vinyl record loading animation */}
                    <div className={styles.vinyl}>
                        <div className={styles.vinylGroove}></div>
                        <div className={styles.vinylLabel}>
                            <div className={styles.vinylCenter}></div>
                        </div>
                    </div>
                    {/* Sound wave particles */}
                    <div className={styles.particles}>
                        <div className={styles.particle}></div>
                        <div className={styles.particle}></div>
                        <div className={styles.particle}></div>
                        <div className={styles.particle}></div>
                        <div className={styles.particle}></div>
                        <div className={styles.particle}></div>
                    </div>
                </div>
                {loadingMessage && <p className={styles.message}>{loadingMessage}</p>}
            </div>
        </div>
    );
}
