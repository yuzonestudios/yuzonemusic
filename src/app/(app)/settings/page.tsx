"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { LogOut, UploadCloud, Sparkles, ImagePlus } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTheme } from "@/context/ThemeContext";
import { getAvatarUrl } from "@/lib/avatar";
import styles from "./settings.module.css";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const { theme, setTheme, animationTheme, setAnimationTheme, customThemeImage, setCustomThemeImage } = useTheme();
    const [displayName, setDisplayName] = useState("");
    const [savedDisplayName, setSavedDisplayName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);
    const [avatarMessage, setAvatarMessage] = useState("");
    const [isSavingThemeImage, setIsSavingThemeImage] = useState(false);
    const [themeImageMessage, setThemeImageMessage] = useState("");
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
                    setAvatarUrl(data.user.image || null);
                    if (data.user.audioQuality) {
                        setAudioQuality(data.user.audioQuality);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        }
    }, []);

    const handleSaveAvatar = async (nextUrl: string | null) => {
        setIsSavingAvatar(true);
        setAvatarMessage("");

        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: nextUrl }),
            });

            const data = await res.json();
            if (data.success) {
                setAvatarUrl(data.user.image || null);
                setAvatarMessage("Profile photo updated!");
                setTimeout(() => setAvatarMessage(""), 3000);
            } else {
                setAvatarMessage(data.error || "Failed to update profile photo");
            }
        } catch (error) {
            console.error("Error updating profile photo:", error);
            setAvatarMessage("An error occurred. Please try again.");
        } finally {
            setIsSavingAvatar(false);
        }
    };

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

    const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setAvatarMessage("Please select an image file.");
            return;
        }

        if (file.size > 1_500_000) {
            setAvatarMessage("Image is too large. Please choose a file under 1.5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!result) {
                setAvatarMessage("Unable to read the selected image.");
                return;
            }
            await handleSaveAvatar(result);
        };
        reader.onerror = () => setAvatarMessage("Unable to read the selected image.");
        reader.readAsDataURL(file);
    };

    const handleThemeImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setThemeImageMessage("Please select an image file.");
            return;
        }

        if (file.size > 1_500_000) {
            setThemeImageMessage("Image is too large. Please choose a file under 1.5MB.");
            return;
        }

        setIsSavingThemeImage(true);
        setThemeImageMessage("");

        const reader = new FileReader();
        reader.onload = async () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!result) {
                setThemeImageMessage("Unable to read the selected image.");
                setIsSavingThemeImage(false);
                return;
            }
            await setCustomThemeImage(result);
            await setTheme("custom-image");
            setThemeImageMessage("Custom theme image saved!");
            setTimeout(() => setThemeImageMessage(""), 3000);
            setIsSavingThemeImage(false);
        };
        reader.onerror = () => {
            setThemeImageMessage("Unable to read the selected image.");
            setIsSavingThemeImage(false);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveThemeImage = async () => {
        setIsSavingThemeImage(true);
        setThemeImageMessage("");
        await setCustomThemeImage(null);
        if (theme === "custom-image") {
            await setTheme("cyber-blue");
        }
        setThemeImageMessage("Custom theme image removed.");
        setTimeout(() => setThemeImageMessage(""), 3000);
        setIsSavingThemeImage(false);
    };

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
                    <h2 className={styles.sectionHeader}>Latest Update</h2>
                    <p className={styles.helperText}>
                        Highlights from the most recent release:
                    </p>
                    <div className={styles.updateList}>
                        <div className={styles.updateItem}>Funky personalized playbar with vibe tags and animated viz.</div>
                        <div className={styles.updateItem}>Custom theme image upload (file-only).</div>
                        <div className={styles.updateItem}>Animation themes for background motion.</div>
                        <div className={styles.updateItem}>Monthly listening time caching and sync tweaks.</div>
                    </div>
                </div>

                <div className={`glass-panel ${styles.section}`}>
                    <h2 className={styles.sectionHeader}>Account</h2>
                    <div className={styles.profile}>
                        <img
                            src={getAvatarUrl(avatarUrl || session.user?.image, displayName || session.user?.name)}
                            alt="Profile"
                            className={styles.avatar}
                        />
                        <div className={styles.profileInfo}>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSaveDisplayName();
                                }}
                                className={styles.nameForm}
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
                            <div className={styles.avatarEditor}>
                                <label className={styles.label} htmlFor="avatarFile">Profile photo</label>
                                <div className={styles.avatarRow}>
                                    <label className={styles.fileInput}>
                                        <UploadCloud size={16} />
                                        Upload image
                                        <input
                                            id="avatarFile"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarFileChange}
                                            disabled={isSavingAvatar}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className={styles.saveBtn}
                                        onClick={() => handleSaveAvatar(null)}
                                        disabled={isSavingAvatar}
                                    >
                                        {isSavingAvatar ? "Saving..." : "Remove"}
                                    </button>
                                </div>
                                <p className={styles.helperText}>Upload a JPG or PNG under 1.5MB.</p>
                                {avatarMessage && (
                                    <p className={`${styles.message} ${avatarMessage.includes("updated") ? styles.success : styles.error}`}>
                                        {avatarMessage}
                                    </p>
                                )}
                            </div>
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
                                    { id: "custom-image", label: "Custom Image", gradient: "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)" },
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

                            <div style={{ width: "100%", borderTop: "1px solid rgba(139, 92, 246, 0.2)", paddingTop: "2rem" }}>
                                <span className={styles.label}>Custom Theme Image</span>
                                <p className={styles.helperText} style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
                                    Upload an image to use as your background theme (syncs across devices).
                                </p>
                                <div className={styles.themeImageRow}>
                                    <div className={styles.themeImagePreview}>
                                        {customThemeImage ? (
                                            <img src={customThemeImage} alt="Custom theme preview" />
                                        ) : (
                                            <div className={styles.themeImagePlaceholder}>
                                                <ImagePlus size={22} />
                                                <span>No image selected</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.themeImageActions}>
                                        <label className={styles.fileInput}>
                                            <UploadCloud size={16} />
                                            Upload image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleThemeImageChange}
                                                disabled={isSavingThemeImage}
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            className={styles.cancelBtn}
                                            onClick={handleRemoveThemeImage}
                                            disabled={!customThemeImage || isSavingThemeImage}
                                        >
                                            Remove
                                        </button>
                                        <span className={styles.fileHint}>PNG/JPG under 1.5MB</span>
                                    </div>
                                </div>
                                {themeImageMessage && (
                                    <p
                                        className={`${styles.message} ${themeImageMessage.includes("saved") || themeImageMessage.includes("removed") ? styles.success : styles.error}`}
                                    >
                                        {themeImageMessage}
                                    </p>
                                )}
                            </div>

                            <div style={{ width: "100%", borderTop: "1px solid rgba(139, 92, 246, 0.2)", paddingTop: "2rem" }}>
                                <span className={styles.label}>Animation Theme</span>
                                <p className={styles.helperText} style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
                                    Add motion to your background theme.
                                </p>
                                <div className={styles.animationGrid}>
                                    {[
                                        { id: "still", label: "Still", desc: "No motion" },
                                        { id: "pulse", label: "Pulse", desc: "Soft breathing glow" },
                                        { id: "float", label: "Float", desc: "Slow drifting" },
                                        { id: "shimmer", label: "Shimmer", desc: "Faster ambient" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setAnimationTheme(opt.id as any)}
                                            className={`${styles.animationOption} ${animationTheme === opt.id ? styles.animationActive : ""}`}
                                        >
                                            <div className={styles.animationLabel}>
                                                <Sparkles size={16} />
                                                {opt.label}
                                            </div>
                                            <div className={styles.animationDesc}>{opt.desc}</div>
                                        </button>
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
                    <div style={{
                        marginTop: "1.5rem",
                        paddingTop: "1.5rem",
                        borderTop: "1px solid rgba(139, 92, 246, 0.2)"
                    }}>
                        <p style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            marginBottom: "0.75rem"
                        }}>
                            <strong>Special thanks to:</strong> Chiranth, Monami Mukherjee for their valuable feedback and support.
                        </p>
                    </div>
                </div>

                <div className={`glass-panel ${styles.section}`}>
                    <h2 className={styles.sectionHeader}>Support the Project</h2>
                    <p className={styles.helperText}>
                        Love Yuzone Music? Help us grow by starring our repository on GitHub!
                    </p>
                    <div style={{
                        marginTop: "1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem"
                    }}>
                        <a
                            href="https://github.com/yuzonestudios/yuzonemusic"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.githubStarBtn}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.75rem",
                                padding: "1rem 1.5rem",
                                background: "linear-gradient(135deg, #333 0%, #181818 100%)",
                                color: "white",
                                textDecoration: "none",
                                borderRadius: "0.75rem",
                                fontSize: "1rem",
                                fontWeight: 600,
                                transition: "all 0.3s ease",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3)";
                                e.currentTarget.style.background = "linear-gradient(135deg, #3a3a3a 0%, #1f1f1f 100%)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.background = "linear-gradient(135deg, #333 0%, #181818 100%)";
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            <span>Star on GitHub</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                        </a>
                        <div style={{
                            padding: "1rem",
                            background: "rgba(139, 92, 246, 0.08)",
                            borderRadius: "0.5rem",
                            border: "1px solid rgba(139, 92, 246, 0.2)"
                        }}>
                            <p style={{
                                fontSize: "0.875rem",
                                color: "var(--text-secondary)",
                                lineHeight: "1.6"
                            }}>
                                ⭐ <strong style={{ color: "var(--text-primary)" }}>Why star us?</strong> It helps us reach more music lovers, motivates continued development, and shows your support for open-source music platforms!
                            </p>
                        </div>
                    </div>
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

                    <div style={{
                        padding: "1.5rem",
                        background: "rgba(236, 72, 153, 0.08)",
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(236, 72, 153, 0.2)",
                        marginTop: "1.5rem"
                    }}>
                        <h3 style={{
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            color: "var(--accent-primary)",
                            marginBottom: "1rem"
                        }}>
                            Credits
                        </h3>
                        <p style={{
                            fontSize: "0.9rem",
                            color: "var(--text-secondary)",
                            lineHeight: "1.6",
                            marginBottom: "0.5rem"
                        }}>
                            Yuzone Music was created with passion and dedication by <strong style={{ color: "var(--text-primary)" }}>Pranab Saini</strong> and <strong style={{ color: "var(--text-primary)" }}>Agnibha Mukherjee</strong>. Their combined expertise in full-stack development and IoT innovation brings this platform to life.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
