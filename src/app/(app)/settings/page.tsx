"use client";

import { useSession } from "next-auth/react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTheme } from "@/context/ThemeContext";
import styles from "./settings.module.css";


export default function SettingsPage() {
    const { data: session, status } = useSession();
    const { theme, setTheme } = useTheme();

    if (status === "loading") {
        return <div className="flex justify-center p-12"><LoadingSpinner size="large" /></div>;
    }

    if (!session) {
        return <div className="p-8 text-center">Please sign in to view settings.</div>;
    }

    return (
        <div>
            <Header title="Settings" />
            <div className={styles.container}>
                <h1 className={`${styles.title} neon-text`}>Settings</h1>

            <div className={`glass-panel ${styles.section}`}>
                <h2 className={styles.sectionHeader}>Account</h2>
                <div className={styles.profile}>
                    <img
                        src={session.user?.image || "/placeholder-user.png"}
                        alt="Profile"
                        className={styles.avatar}
                    />
                    <div className={styles.profileInfo}>
                        <p className={styles.name}>{session.user?.name}</p>
                        <p className={styles.email}>{session.user?.email}</p>
                    </div>
                </div>
            </div>

            <div className={`glass-panel ${styles.section}`}>
                <h2 className={styles.sectionHeader}>Preferences</h2>
                <div className={styles.preferences}>
                    {/* Audio Quality Removed as per request */}

                    <div className={styles.preferenceItem} style={{ flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
                        <span className={styles.label}>Theme</span>
                        <div className={styles.themeGrid}>
                            {[
                                { id: "blood-red", label: "Blood Red", gradient: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" },
                                { id: "toxic-green", label: "Toxic Green", gradient: "linear-gradient(135deg, #84cc16 0%, #3f6212 100%)" },
                                { id: "cyber-blue", label: "Cyber Blue", gradient: "linear-gradient(135deg, #00f0ff 0%, #0088ff 100%)" },
                                { id: "phonk-purple", label: "Phonk Purple", gradient: "linear-gradient(135deg, #7e22ce 0%, #2e1065 100%)" },
                                { id: "sunset-orange", label: "Sunset Orange", gradient: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)" },
                                { id: "midnight-black", label: "Midnight Black", gradient: "linear-gradient(135deg, #6b7280 0%, #374151 100%)" },
                                { id: "neon-pink", label: "Neon Pink", gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" },
                                { id: "ocean-teal", label: "Ocean Teal", gradient: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)" },
                                { id: "ambient", label: "Ambient (Dynamic)", gradient: "linear-gradient(135deg, #eee 0%, #333 100%)" },
                            ].map((t) => (
                                <div
                                    key={t.id}
                                    className={`${styles.themeOption} ${theme === t.id ? styles.active : ""}`}
                                    onClick={() => setTheme(t.id as any)}
                                >
                                    <div
                                        className={styles.swatch}
                                        style={{ "--gradient": t.gradient } as React.CSSProperties}
                                    />
                                    <span className={styles.themeName}>{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
