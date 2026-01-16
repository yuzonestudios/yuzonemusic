"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Play, Trash2, Music, ArrowLeft, User, Share2, Shuffle } from "lucide-react";
import SongCard from "@/components/cards/SongCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { usePlayerStore } from "@/store/playerStore";
import type { Song as GlobalSong } from "@/types";
import ShareModal from "@/components/ui/ShareModal";
import styles from "./playlist-detail.module.css";

interface Song {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    addedAt: string;
}

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    thumbnail?: string;
    songs: Song[];
    songCount: number;
    createdAt: string;
    updatedAt: string;
}

export default function PlaylistDetailPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const playlistId = params.id as string;
    
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(true);
    const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
    });
    const [shareModal, setShareModal] = useState({ isOpen: false, contentId: "", contentName: "" });
    
    const { setQueue, setCurrentSong, play, toggleShuffle } = usePlayerStore();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && playlistId) {
            fetchPlaylist();
            fetchLikedSongs();
        }
    }, [status, playlistId, router]);

    const fetchPlaylist = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/playlists?id=${playlistId}`);
            const data = await res.json();
            if (data.success) {
                setPlaylist(data.playlist);
            } else {
                setConfirmDialog({
                    isOpen: true,
                    title: "Error",
                    message: data.error || "Failed to load playlist",
                    onConfirm: () => router.push("/playlists"),
                });
            }
        } catch (error) {
            console.error("Error fetching playlist:", error);
            setConfirmDialog({
                isOpen: true,
                title: "Error",
                message: "Failed to load playlist",
                onConfirm: () => router.push("/playlists"),
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchLikedSongs = async () => {
        try {
            const res = await fetch("/api/liked");
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    const ids = new Set(data.data.map((s: GlobalSong) => s.videoId));
                    setLikedSongIds(ids as Set<string>);
                }
            }
        } catch (error) {
            console.error("Error fetching liked songs:", error);
        }
    };

    const handleLike = async (song: GlobalSong) => {
        const isLiked = likedSongIds.has(song.videoId);

        try {
            if (isLiked) {
                const res = await fetch(`/api/liked?videoId=${song.videoId}`, {
                    method: "DELETE",
                });

                if (res.ok) {
                    setLikedSongIds((prev) => {
                        const next = new Set(prev);
                        next.delete(song.videoId);
                        return next;
                    });

                    window.dispatchEvent(
                        new CustomEvent("songLiked", {
                            detail: { videoId: song.videoId, liked: false },
                        })
                    );
                }
            } else {
                const res = await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(song),
                });

                if (res.ok) {
                    setLikedSongIds((prev) => new Set(prev).add(song.videoId));

                    window.dispatchEvent(
                        new CustomEvent("songLiked", {
                            detail: { videoId: song.videoId, liked: true },
                        })
                    );
                }
            }
        } catch (error) {
            console.error("Failed to update like:", error);
        }
    };

    const handlePlayPlaylist = () => {
        if (playlist && playlist.songs.length > 0) {
            setQueue(playlist.songs);
            setCurrentSong(playlist.songs[0]);
            play();
        }
    };

    const handleShufflePlay = () => {
        if (playlist && playlist.songs.length > 0) {
            setQueue(playlist.songs);
            setCurrentSong(playlist.songs[0]);
            toggleShuffle();
            play();
        }
    };

    const handleDeletePlaylist = async () => {
        if (!playlist) return;

        setConfirmDialog({
            isOpen: true,
            title: "Delete Playlist",
            message: `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/playlists?id=${playlistId}`, {
                        method: "DELETE",
                    });

                    const data = await res.json();
                    if (data.success) {
                        router.push("/playlists");
                    } else {
                        setConfirmDialog({
                            isOpen: true,
                            title: "Error",
                            message: data.error || "Failed to delete playlist",
                            onConfirm: () => setConfirmDialog({ ...confirmDialog, isOpen: false }),
                        });
                    }
                } catch (error) {
                    console.error("Error deleting playlist:", error);
                    setConfirmDialog({
                        isOpen: true,
                        title: "Error",
                        message: "Failed to delete playlist",
                        onConfirm: () => setConfirmDialog({ ...confirmDialog, isOpen: false }),
                    });
                }
            },
        });
    };

    const handleRemoveSong = async (videoId: string) => {
        if (!playlist) return;

        const song = playlist.songs.find(s => s.videoId === videoId);
        if (!song) return;

        setConfirmDialog({
            isOpen: true,
            title: "Remove Song",
            message: `Remove "${song.title}" from this playlist?`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/playlists/${playlistId}/songs?videoId=${videoId}`, {
                        method: "DELETE",
                    });

                    const data = await res.json();
                    if (data.success) {
                        // Update local state
                        setPlaylist({
                            ...playlist,
                            songs: playlist.songs.filter(s => s.videoId !== videoId),
                            songCount: playlist.songCount - 1,
                        });
                        setConfirmDialog({ ...confirmDialog, isOpen: false });
                    } else {
                        setConfirmDialog({
                            isOpen: true,
                            title: "Error",
                            message: data.error || "Failed to remove song",
                            onConfirm: () => setConfirmDialog({ ...confirmDialog, isOpen: false }),
                        });
                    }
                } catch (error) {
                    console.error("Error removing song:", error);
                    setConfirmDialog({
                        isOpen: true,
                        title: "Error",
                        message: "Failed to remove song",
                        onConfirm: () => setConfirmDialog({ ...confirmDialog, isOpen: false }),
                    });
                }
            },
        });
    };

    if (status === "loading" || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading playlist...</div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>
                        <Music size={32} />
                    </div>
                    <div className={styles.emptyTitle}>Playlist not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <button className={styles.backBtn} onClick={() => router.push("/playlists")}>
                <ArrowLeft size={20} />
                Back to Playlists
            </button>

            <div className={styles.header}>
                <div className={styles.thumbnail}>
                    {playlist.thumbnail ? (
                        <Image
                            src={playlist.thumbnail}
                            alt={playlist.name}
                            width={200}
                            height={200}
                        />
                    ) : (
                        <Music size={64} className={styles.placeholderIcon} />
                    )}
                </div>

                <div className={styles.info}>
                    <span className={styles.badge}>Playlist</span>
                    <h1 className={styles.title}>{playlist.name}</h1>
                    
                    {playlist.description && (
                        <p className={styles.description}>{playlist.description}</p>
                    )}

                    <div className={styles.meta}>
                        <span className={styles.metaItem}>
                            <User size={16} />
                            {session?.user?.name || "You"}
                        </span>
                        <span>•</span>
                        <span>{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</span>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={styles.playBtn}
                            onClick={handlePlayPlaylist}
                            disabled={playlist.songs.length === 0}
                        >
                            <Play size={20} fill="white" />
                            Play
                        </button>
                        <button
                            className={`${styles.secondaryBtn} ${styles.shuffleBtn}`}
                            onClick={handleShufflePlay}
                            disabled={playlist.songs.length === 0}
                        >
                            <Shuffle size={18} />
                            Shuffle
                        </button>
                        <button
                            className={styles.secondaryBtn}
                            onClick={() => setShareModal({ isOpen: true, contentId: playlistId, contentName: playlist.name })}
                        >
                            <Share2 size={18} />
                            Share
                        </button>
                        <button
                            className={`${styles.secondaryBtn} ${styles.deleteBtn}`}
                            onClick={handleDeletePlaylist}
                        >
                            <Trash2 size={18} />
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {playlist.songs.length > 0 ? (
                    <>
                        <h2 className={styles.sectionTitle}>Songs</h2>
                        <div className={styles.songGrid}>
                            {[...playlist.songs]
                                .sort((a, b) => (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase()))
                                .map((song, index) => (
                                <SongCard
                                    key={`${song.videoId}-${index}`}
                                    song={song}
                                    songs={playlist.songs}
                                    index={index}
                                    onLike={handleLike}
                                    isLiked={likedSongIds.has(song.videoId)}
                                    hideAddToPlaylist={true}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <Music size={32} />
                        </div>
                        <div className={styles.emptyTitle}>No songs in this playlist</div>
                        <p>Add songs to this playlist from any song card</p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                variant={confirmDialog.title === "Error" ? "info" : "warning"}
            />

            {shareModal.isOpen && (
                <ShareModal
                    contentType="playlist"
                    contentId={shareModal.contentId}
                    contentName={shareModal.contentName}
                    onClose={() => setShareModal({ isOpen: false, contentId: "", contentName: "" })}
                />
            )}
        </div>
    );
}
