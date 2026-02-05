"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Music, Plus, CheckCircle } from "lucide-react";
import styles from "./PlaylistModal.module.css";

interface Song {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
}

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    thumbnail?: string;
    songCount: number;
}

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: Song | null;
    onCreateNew?: () => void;
    onAddSuccess?: () => void;
}

export default function AddToPlaylistModal({
    isOpen,
    onClose,
    song,
    onCreateNew,
    onAddSuccess,
}: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchPlaylists();
            setMessage(null);
            setSelectedPlaylistId(null);
        }
    }, [isOpen]);

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/playlists");
            const data = await res.json();
            if (data.success) {
                setPlaylists(data.playlists);
            }
        } catch (error) {
            console.error("Error fetching playlists:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        if (!song || selectedPlaylistId) return;

        setSelectedPlaylistId(playlistId);

        try {
            const res = await fetch(`/api/playlists/${playlistId}/songs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(song),
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: "success", text: "Song added to playlist!" });
                if (onAddSuccess) {
                    onAddSuccess();
                }
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setMessage({ type: "error", text: data.error || "Failed to add song to playlist" });
                setSelectedPlaylistId(null);
            }
        } catch (error) {
            console.error("Error adding song to playlist:", error);
            setMessage({ type: "error", text: "Failed to add song to playlist" });
            setSelectedPlaylistId(null);
        }
    };

    const handleCreateNew = () => {
        onClose();
        if (onCreateNew) {
            onCreateNew();
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !song || !mounted) return null;

    const modalContent = (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Add to Playlist</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {message && (
                    <div className={`${styles.message} ${styles[message.type]}`}>
                        {message.type === "success" ? <CheckCircle size={20} /> : <X size={20} />}
                        <span>{message.text}</span>
                    </div>
                )}

                {loading ? (
                    <div className={styles.emptyState}>Loading playlists...</div>
                ) : playlists.length > 0 ? (
                    <div className={styles.playlistList}>
                        {playlists.map((playlist) => (
                            <div
                                key={playlist._id}
                                className={styles.playlistItem}
                                onClick={() => handleAddToPlaylist(playlist._id)}
                                style={{ 
                                    pointerEvents: selectedPlaylistId ? "none" : "auto",
                                    opacity: selectedPlaylistId && selectedPlaylistId !== playlist._id ? 0.5 : 1
                                }}
                            >
                                <div className={styles.playlistItemThumbnail}>
                                    {playlist.thumbnail ? (
                                        <Image
                                            src={playlist.thumbnail}
                                            alt={playlist.name}
                                            width={48}
                                            height={48}
                                        />
                                    ) : (
                                        <Music size={20} />
                                    )}
                                </div>
                                <div className={styles.playlistItemInfo}>
                                    <div className={styles.playlistItemName}>
                                        {playlist.name}
                                    </div>
                                    <div className={styles.playlistItemMeta}>
                                        {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateTitle}>No playlists yet</div>
                        <p>Create your first playlist to get started</p>
                    </div>
                )}

                <button
                    className={styles.createNewBtn}
                    onClick={handleCreateNew}
                >
                    <Plus size={16} />
                    Create New Playlist
                </button>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
