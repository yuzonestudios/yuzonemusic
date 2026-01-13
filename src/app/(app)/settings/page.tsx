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
                    <div className={styles.preferenceItem}>
                        <span className={styles.label}>Audio Quality</span>
                        <select className={styles.select}>
                            <option value="high">High (AAC 128kbps)</option>
                            <option value="low">Low (Data Saver)</option>
                        </select>
                    </div>
                    <div className={styles.preferenceItem} style={{ alignItems: "flex-start" }}>
                        <span className={styles.label}>Theme</span>
                        <div className={styles.themeGrid}>
                            {[
                                { id: "cyan", label: "Neon Cyan", gradient: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" },
                                { id: "purple", label: "Neon Purple", gradient: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" },
                                { id: "orange", label: "Neon Orange", gradient: "linear-gradient(135deg, #f97316 0%, #eab308 100%)" },
                                { id: "green", label: "Neon Green", gradient: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)" },
                                { id: "blood-red", label: "Blood Red", gradient: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" },
                                { id: "toxic-green", label: "Toxic Green", gradient: "linear-gradient(135deg, #84cc16 0%, #3f6212 100%)" },
                                { id: "cyber-blue", label: "Cyber Blue", gradient: "linear-gradient(135deg, #00f0ff 0%, #0088ff 100%)" },
                                { id: "phonk-purple", label: "Phonk Purple", gradient: "linear-gradient(135deg, #7e22ce 0%, #2e1065 100%)" },
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

            <div className={`glass-panel ${styles.section}`}>
                <h2 className={styles.sectionHeader}>About</h2>
                <p className={styles.about}>
                    Yuzone Music<br />
                    Powered by Next.js 16.1.1 & YouTube Music
                </p>
            </div>
        </div>
    );
}
