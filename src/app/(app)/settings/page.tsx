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
                                    { id: "crimson-glow", label: "Crimson Glow", gradient: "linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)" },
                                    { id: "forest-night", label: "Forest Night", gradient: "linear-gradient(135deg, #166534 0%, #0b3b22 100%)" },
                                    { id: "gold-ember", label: "Gold Ember", gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" },
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

                <div className={`glass-panel ${styles.section}`}>
                    <h2 className={styles.sectionHeader}>About Yuzone Music</h2>
                    <div className={styles.about}>
                        <p style={{ marginBottom: "1rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                            Yuzone Music is a modern music streaming platform built with cutting-edge technology, offering personalized playlists, high-quality audio streaming, and seamless integration for an immersive listening experience.
                        </p>
                        
                        <div style={{ 
                            padding: "1.5rem", 
                            background: "rgba(139, 92, 246, 0.08)",
                            borderRadius: "0.75rem",
                            border: "1px solid rgba(139, 92, 246, 0.2)",
                            marginBottom: "1rem"
                        }}>
                            <h3 style={{ 
                                fontSize: "1.1rem", 
                                fontWeight: 700, 
                                color: "var(--accent-primary)",
                                marginBottom: "1rem" 
                            }}>
                                Meet the Developers
                            </h3>
                            
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h4 style={{ 
                                    fontSize: "1rem", 
                                    fontWeight: 600, 
                                    color: "var(--text-primary)",
                                    marginBottom: "0.5rem"
                                }}>
                                    Agnibha Mukherjee
                                </h4>
                                <p style={{ 
                                    fontSize: "0.9rem", 
                                    color: "var(--text-secondary)",
                                    lineHeight: "1.6",
                                    marginBottom: "0.5rem"
                                }}>
                                    A full-stack developer with 7+ years of experience transforming ambitious ideas into real-life scalable applications. Specializing in React, Next.js, Node.js, Python, and backend optimization, Agnibha has completed 56+ projects with a focus on quality, reliable communication, and on-time delivery. His expertise spans from building production-level web apps to integrating machine learning models and RESTful APIs.
                                </p>
                                <a 
                                    href="https://agnibha.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                        color: "var(--accent-primary)",
                                        fontSize: "0.875rem",
                                        textDecoration: "none",
                                        fontWeight: 500
                                    }}
                                >
                                    Visit Portfolio →
                                </a>
                            </div>

                            <div style={{ marginBottom: "1rem" }}>
                                <h4 style={{ 
                                    fontSize: "1rem", 
                                    fontWeight: 600, 
                                    color: "var(--text-primary)",
                                    marginBottom: "0.5rem"
                                }}>
                                    Pranab Saini
                                </h4>
                                <p style={{ 
                                    fontSize: "0.9rem", 
                                    color: "var(--text-secondary)",
                                    lineHeight: "1.6",
                                    marginBottom: "0.5rem"
                                }}>
                                    A passionate tech enthusiast and IoT developer with expertise in web development, programming, and leadership. Pranab has completed 15+ projects including interactive web applications, IoT solutions, and educational platforms. With a 94% academic average and 10 awards, he brings creativity and technical excellence to every project, from building typing test applications to developing smart charging systems.
                                </p>
                                <a 
                                    href="https://pranab.tech" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                        color: "var(--accent-primary)",
                                        fontSize: "0.875rem",
                                        textDecoration: "none",
                                        fontWeight: 500
                                    }}
                                >
                                    Visit Portfolio →
                                </a>
                            </div>

                            <div style={{
                                padding: "1rem",
                                background: "rgba(59, 130, 246, 0.08)",
                                borderRadius: "0.5rem",
                                border: "1px solid rgba(59, 130, 246, 0.2)",
                                marginTop: "1rem"
                            }}>
                                <p style={{ 
                                    fontSize: "0.9rem", 
                                    color: "var(--text-secondary)",
                                    marginBottom: "0.75rem",
                                    lineHeight: "1.5"
                                }}>
                                    Co-founders of <strong style={{ color: "var(--text-primary)" }}>RepoSphere</strong> — a platform dedicated to innovative software solutions and open-source contributions.
                                </p>
                                <a 
                                    href="https://reposphere.tech" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        padding: "0.5rem 1rem",
                                        background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                                        color: "white",
                                        textDecoration: "none",
                                        borderRadius: "0.5rem",
                                        fontSize: "0.875rem",
                                        fontWeight: 600,
                                        transition: "all 0.3s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    Visit RepoSphere
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}