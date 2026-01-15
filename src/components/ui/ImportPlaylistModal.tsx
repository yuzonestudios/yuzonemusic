"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Music, Download } from "lucide-react";
import styles from "./PlaylistModal.module.css";
import importStyles from "./ImportPlaylistModal.module.css";

interface Track {
    title: string;
    authors: string[];
    videoId: string;
    thumbnail: string;
}

interface PlaylistData {
    playlistAuthor: string;
    playlistName?: string;
    trackCount: number;
    tracks: Track[];
}

interface ImportPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (tracks: Track[], name: string, author: string) => Promise<void>;
}

export default function ImportPlaylistModal({
    isOpen,
    onClose,
    onImport,
}: ImportPlaylistModalProps) {
    const [activeTab, setActiveTab] = useState<"spotify" | "youtube">("spotify");
    const [playlistLink, setPlaylistLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFetch = async () => {
        if (!playlistLink.trim()) return;

        setLoading(true);
        setError(null);
        setPlaylistData(null);

        try {
            // Use our proxy API endpoint instead of calling external API directly
            const res = await fetch("/api/import-playlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    url: playlistLink,
                    source: activeTab 
                }),
            });

            const data = await res.json();
            
            if (res.ok && data.tracks) {
                setPlaylistData(data);
            } else {
                setError(data.error || "Failed to fetch playlist. Please check the link and try again.");
            }
        } catch (err) {
            console.error("Error fetching playlist:", err);
            setError("An error occurred while fetching the playlist.");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!playlistData) return;

        try {
            const playlistName = playlistData.playlistName || `Imported from ${activeTab === "spotify" ? "Spotify" : "YouTube Music"}`;
            await onImport(playlistData.tracks, playlistName, playlistData.playlistAuthor);
            handleClose();
        } catch (err) {
            console.error("Error importing playlist:", err);
            setError("Failed to import playlist. Please try again.");
        }
    };

    const handleClose = () => {
        setPlaylistLink("");
        setPlaylistData(null);
        setError(null);
        setActiveTab("spotify");
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={`${styles.modal} ${importStyles.importModal}`}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Import Playlist</h2>
                    <button className={styles.closeBtn} onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {!loading && !playlistData && (
                    <>
                        <div className={importStyles.tabs}>
                            <button
                                className={`${importStyles.tab} ${activeTab === "spotify" ? importStyles.active : ""}`}
                                onClick={() => setActiveTab("spotify")}
                            >
                                Spotify
                            </button>
                            <button
                                className={`${importStyles.tab} ${activeTab === "youtube" ? importStyles.active : ""}`}
                                onClick={() => setActiveTab("youtube")}
                            >
                                YouTube Music
                            </button>
                        </div>

                        <div className={importStyles.inputGroup}>
                            <input
                                type="text"
                                className={importStyles.input}
                                placeholder={`Paste ${activeTab === "spotify" ? "Spotify" : "YouTube Music"} playlist link here`}
                                value={playlistLink}
                                onChange={(e) => setPlaylistLink(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleFetch()}
                            />
                            <p className={importStyles.hint}>
                                {activeTab === "spotify"
                                    ? "Example: https://open.spotify.com/playlist/..."
                                    : "Example: https://music.youtube.com/playlist?list=..."}
                            </p>
                        </div>

                        {error && (
                            <div className={`${styles.message} ${styles.error}`}>
                                <X size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            className={importStyles.importBtn}
                            onClick={handleFetch}
                            disabled={!playlistLink.trim()}
                        >
                            <Download size={20} />
                            Fetch Playlist
                        </button>
                    </>
                )}

                {loading && (
                    <div className={importStyles.loading}>
                        <div className={importStyles.spinner}></div>
                        <p className={importStyles.loadingText}>Fetching playlist...</p>
                    </div>
                )}

                {!loading && playlistData && (
                    <>
                        <div className={importStyles.preview}>
                            <div className={importStyles.previewHeader}>
                                <div className={importStyles.previewIcon}>
                                    <Music size={32} />
                                </div>
                                <div className={importStyles.previewInfo}>
                                    <h3>{playlistData.playlistName || "Imported Playlist"}</h3>
                                    <p>by {playlistData.playlistAuthor}</p>
                                </div>
                            </div>
                            <div className={importStyles.previewMeta}>
                                <span>{playlistData.trackCount} tracks</span>
                                <span>•</span>
                                <span>Ready to import</span>
                            </div>

                            <div className={importStyles.trackList}>
                                {playlistData.tracks.slice(0, 5).map((track, index) => (
                                    <div key={index} className={importStyles.trackItem}>
                                        <div className={importStyles.trackThumbnail}>
                                            <Image
                                                src={track.thumbnail}
                                                alt={track.title}
                                                width={40}
                                                height={40}
                                            />
                                        </div>
                                        <div className={importStyles.trackInfo}>
                                            <div className={importStyles.trackTitle}>{track.title}</div>
                                            <div className={importStyles.trackArtist}>
                                                {track.authors.join(", ")}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {playlistData.trackCount > 5 && (
                                    <div className={importStyles.trackItem}>
                                        <div className={importStyles.trackInfo}>
                                            <div className={importStyles.trackTitle}>
                                                +{playlistData.trackCount - 5} more tracks...
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={importStyles.actions}>
                            <button
                                className={`${importStyles.btn} ${importStyles.cancelBtn}`}
                                onClick={handleClose}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${importStyles.btn} ${importStyles.confirmBtn}`}
                                onClick={handleImport}
                            >
                                Import Playlist
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
