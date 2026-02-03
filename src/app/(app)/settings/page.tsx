"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTheme } from "@/context/ThemeContext";
import styles from "./settings.module.css";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const { theme, setTheme } = useTheme();
    const [displayName, setDisplayName] = useState("");
    const [savedDisplayName, setSavedDisplayName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [suggestion, setSuggestion] = useState("");
    const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
    const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [audioQuality, setAudioQuality] = useState<1 | 2 | 3>(2);
    const [isSavingQuality, setIsSavingQuality] = useState(false);
    const [qualityMessage, setQualityMessage] = useState("");
    const [defaultSort, setDefaultSort] = useState<"alphabetical" | "dateAdded">("alphabetical");
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string>("");
    const [clearingSyncData, setClearingSyncData] = useState(false);

    const handleSaveQuality = async (quality: 1 | 2 | 3) => {
        setIsSavingQuality(true);
        setQualityMessage("");
        
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioQuality: quality }),
            });

            const data = await res.json();

            if (data.success) {
                setAudioQuality(quality);
                setQualityMessage("Audio quality preference saved!");
                setTimeout(() => setQualityMessage(""), 3000);
            } else {
                setQualityMessage(data.error || "Failed to save quality preference");
            }
        } catch (error) {
            console.error("Error saving quality preference:", error);
            setQualityMessage("An error occurred. Please try again.");
        } finally {
            setIsSavingQuality(false);
        }
    };

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch("/api/user/profile");
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    const name = data.user.displayName || data.user.name;
                    setDisplayName(name);
                    setSavedDisplayName(name);
                    if (data.user.audioQuality) {
                        setAudioQuality(data.user.audioQuality);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        }
    }, []);

    useEffect(() => {
        if (session) {
            fetchProfile();
            
            // Get device ID from localStorage
            const storedDeviceId = localStorage.getItem("yuzone-device-id");
            if (storedDeviceId) {
                setDeviceId(storedDeviceId);
            }
            
            // Check last sync time
            const lastSync = localStorage.getItem("yuzone-last-sync");
            if (lastSync) {
                const date = new Date(parseInt(lastSync));
                setLastSyncTime(date.toLocaleString());
            }
        }
    }, [session, fetchProfile]);

    const handleSaveDisplayName = async () => {
        if (!displayName.trim() || displayName.length < 2 || displayName.length > 50) {
            setSaveMessage("Display name must be between 2 and 50 characters");
            return;
        }

        setIsSaving(true);
        setSaveMessage("");

        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName: displayName.trim() }),
            });

            const data = await res.json();

            if (data.success) {
                const updated = displayName.trim();
                setDisplayName(updated);
                setSavedDisplayName(updated);
                setSaveMessage("Display name updated successfully!");
                setIsEditingName(false);
                setTimeout(() => setSaveMessage(""), 3000);
            } else {
                setSaveMessage(data.error || "Failed to update display name");
            }
        } catch (error) {
            console.error("Error updating display name:", error);
            setSaveMessage("An error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const submitSuggestion = async () => {
        const text = suggestion.trim();
        if (text.length < 5 || text.length > 500) {
            setSuggestionMessage("Suggestion must be between 5 and 500 characters");
            return;
        }

        setIsSubmittingSuggestion(true);
        setSuggestionMessage(null);

        try {
            const res = await fetch("/api/feature-suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ suggestion: text }),
            });

            const data = await res.json();
            if (data.success) {
                setSuggestion("");
                setSuggestionMessage("Thanks for sharing! We review every idea.");
            } else {
                setSuggestionMessage(data.error || "Could not submit suggestion.");
            }
        } catch (error) {
            console.error("Error submitting suggestion:", error);
            setSuggestionMessage("Something went wrong. Please try again.");
        } finally {
            setIsSubmittingSuggestion(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await signOut({ redirect: true, callbackUrl: "/login" });
    };

    const handleClearSyncData = async () => {
        if (!confirm("Are you sure you want to clear your synced player data? This will remove your queue and playback position from the server.")) {
            return;
        }

        setClearingSyncData(true);
        try {
            const response = await fetch("/api/sync", {
                method: "DELETE",
                headers: {
                    "X-Device-Id": deviceId,
                },
            });

            if (response.ok) {
                setLastSyncTime(null);
                localStorage.removeItem("yuzone-last-sync");
                alert("Sync data cleared successfully");
            } else {
                alert("Failed to clear sync data");
            }
        } catch (error) {
            console.error("Error clearing sync data:", error);
            alert("An error occurred while clearing sync data");
        } finally {
            setClearingSyncData(false);
        }
    };

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
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSaveDisplayName();
                                }}
                                style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", width: "100%" }}
                            >
                                {isEditingName ? (
                                    <>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className={styles.nameInput}
                                            placeholder="Enter display name"
                                            maxLength={50}
                                            inputMode="text"
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSaveDisplayName();
                                                } else if (e.key === "Escape") {
                                                    setIsEditingName(false);
                                                    setDisplayName(savedDisplayName);
                                                    setSaveMessage("");
                                                }
                                            }}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => handleSaveDisplayName()}
                                            disabled={isSaving}
                                            className={styles.saveBtn}
                                        >
                                            {isSaving ? "Saving..." : "Save"}
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsEditingName(false);
                                                setDisplayName(savedDisplayName);
                                                setSaveMessage("");
                                            }}
                                            className={styles.cancelBtn}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className={styles.name}>{displayName || session.user?.name}</p>
                                        <button 
                                            type="button"
                                            onClick={() => setIsEditingName(true)}
                                            className={styles.editBtn}
                                            title="Edit display name"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </form>
                            {saveMessage && (
                                <p className={`${styles.message} ${saveMessage.includes("success") ? styles.success : styles.error}`}>
                                    {saveMessage}
                                </p>
                            )}
                            <p className={styles.email}>{session.user?.email}</p>
                            
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className={styles.logoutBtn}
                                title="Log out of your account"
                            >
                                <LogOut size={18} />
                                {isLoggingOut ? "Logging out..." : "Log Out"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`glass-panel ${styles.section}`}>
                    <h2 className={styles.sectionHeader}>Preferences</h2>
                    <div className={styles.preferences}>
                        <div className={styles.preferenceItem} style={{ flexDirection: "column", alignItems: "flex-start", gap: "2rem", width: "100%" }}>
                            <div style={{ width: "100%" }}>
                                <span className={styles.label}>Audio Quality</span>
                                <p className={styles.helperText} style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>Choose your preferred download and streaming quality</p>
                                <div className={styles.qualityGrid}>
                                    {[
                                        { level: 1, label: "Low", bitrate: "96 kbps", description: "Mobile optimized", size: "~0.7 MB/min" },
                                        { level: 2, label: "Medium", bitrate: "128 kbps", description: "Balanced (Default)", size: "~1 MB/min" },
                                        { level: 3, label: "High", bitrate: "320 kbps", description: "High quality", size: "~2.4 MB/min" },
                                    ].map((q) => (
                                        <button
                                            key={q.level}
                                            onClick={() => handleSaveQuality(q.level as 1 | 2 | 3)}
                                            disabled={isSavingQuality}
                                            className={`${styles.qualityOption} ${audioQuality === q.level ? styles.qualityActive : ""}`}
                                        >
                                            <div className={styles.qualityLabel}>{q.label}</div>
                                            <div className={styles.qualityBitrate}>{q.bitrate}</div>
                                            <div className={styles.qualityDesc}>{q.description}</div>
                                            <div className={styles.qualitySize}>{q.size}</div>
                                        </button>
                                    ))}
                                </div>
                                {qualityMessage && (
                                    <p className={`${styles.message} ${qualityMessage.includes("saved") ? styles.success : styles.error}`} style={{ marginTop: "1rem" }}>
                                        {qualityMessage}
                                    </p>
                                )}
                            </div>

                            <div style={{ width: "100%", borderTop: "1px solid rgba(139, 92, 246, 0.2)", paddingTop: "2rem" }}>
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

                            {/* Default Sort - Responsive */}
                            <div style={{ width: "100%", borderTop: "1px solid rgba(139, 92, 246, 0.2)", paddingTop: "2rem" }}>
                                <span className={styles.label}>Default Sort</span>
                                <p className={styles.helperText} style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>Choose how lists are sorted by default</p>
                                <div className={styles.sortGrid}>
                                    {[
                                        { id: "alphabetical", label: "Alphabetical", desc: "A → Z" },
                                        { id: "dateAdded", label: "Date Added", desc: "Newest first" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setDefaultSort(opt.id as "alphabetical" | "dateAdded")}
                                            className={`${styles.sortOption} ${defaultSort === opt.id ? styles.sortActive : ""}`}
                                        >
                                            <div className={styles.sortLabel}>{opt.label}</div>
                                            <div className={styles.sortDesc}>{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`glass-panel ${styles.section}`}>
                    <h2 className={styles.sectionHeader}>Cross-Device Sync</h2>
                    <p className={styles.helperText}>
                        Your queue, playback position, and preferences sync across all your devices automatically.
                    </p>
                    
                    <div className={styles.syncInfo} style={{ marginTop: "1.5rem" }}>
                        <div style={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "1rem",
                            padding: "1.25rem",
                            background: "rgba(139, 92, 246, 0.08)",
                            borderRadius: "0.75rem",
                            border: "1px solid rgba(139, 92, 246, 0.2)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <div style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    background: syncEnabled ? "#10b981" : "#6b7280",
                                    boxShadow: syncEnabled ? "0 0 10px rgba(16, 185, 129, 0.5)" : "none"
                                }} />
                                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                                    {syncEnabled ? "Sync Active" : "Sync Disabled"}
                                </span>
                            </div>
                            
                            {lastSyncTime && (
                                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                    <strong>Last synced:</strong> {lastSyncTime}
                                </div>
                            )}
                            
                            {deviceId && (
                                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                    <strong>Device ID:</strong> {deviceId.substring(0, 16)}...
                                </div>
                            )}
                            
                            <div style={{ 
                                marginTop: "0.5rem",
                                paddingTop: "1rem",
                                borderTop: "1px solid rgba(139, 92, 246, 0.2)"
                            }}>
                                <h4 style={{ 
                                    fontSize: "0.9rem", 
                                    fontWeight: 600, 
                                    color: "var(--text-primary)",
                                    marginBottom: "0.5rem"
                                }}>
                                    What syncs?
                                </h4>
                                <ul style={{ 
                                    fontSize: "0.875rem", 
                                    color: "var(--text-secondary)",
                                    lineHeight: "1.8",
                                    paddingLeft: "1.25rem",
                                    listStyle: "disc"
                                }}>
                                    <li>Current song and queue</li>
                                    <li>Playback position</li>
                                    <li>Volume and playback speed</li>
                                    <li>Repeat and shuffle settings</li>
                                </ul>
                            </div>
                            
                            <button
                                onClick={handleClearSyncData}
                                disabled={clearingSyncData}
                                className={styles.clearSyncBtn}
                                style={{
                                    marginTop: "0.5rem",
                                    padding: "0.75rem 1rem",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    color: "#ef4444",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    borderRadius: "0.5rem",
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                                }}
                            >
                                {clearingSyncData ? "Clearing..." : "Clear Synced Data"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`glass-panel ${styles.section}`}>
                    <h2 className={styles.sectionHeader}>Feature Suggestions</h2>
                    <p className={styles.helperText}>Tell us what you want next. We read every note.</p>
                    <textarea
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        placeholder="Share a feature or improvement..."
                        maxLength={500}
                        className={styles.suggestionInput}
                    />
                    <div className={styles.suggestionActions}>
                        <span className={styles.charCount}>{suggestion.length}/500</span>
                        <button
                            onClick={submitSuggestion}
                            disabled={isSubmittingSuggestion}
                            className={styles.submitSuggestionBtn}
                        >
                            {isSubmittingSuggestion ? "Sending..." : "Send suggestion"}
                        </button>
                    </div>
                    {suggestionMessage && (
                        <p className={`${styles.message} ${suggestionMessage.toLowerCase().includes("thank") ? styles.success : styles.error}`}>
                            {suggestionMessage}
                        </p>
                    )}
                </div>

                <div className={`glass-panel ${styles.section}`}>
                    <h2 className={styles.sectionHeader}>Legal</h2>
                    <p className={styles.helperText}>Review the terms that keep Yuzone Music safe and fair.</p>
                    <Link href="/terms" className={styles.legalCard}>
                        <div className={styles.legalContent}>
                            <div className={styles.legalTitle}>Terms of Service</div>
                            <div className={styles.legalDescription}>
                                Learn your rights, responsibilities, and how we protect the community.
                            </div>
                        </div>
                        <span className={styles.legalCta}>Open →</span>
                    </Link>
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
