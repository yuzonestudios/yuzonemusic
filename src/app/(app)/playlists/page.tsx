"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Music, Download } from "lucide-react";
import PlaylistCard from "@/components/cards/PlaylistCard";
import CreatePlaylistModal from "@/components/ui/CreatePlaylistModal";
import ImportPlaylistModal from "@/components/ui/ImportPlaylistModal";
import { usePlayerStore } from "@/store/playerStore";
import styles from "./playlists.module.css";

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    thumbnail?: string;
    songCount: number;
    songs?: Array<{
        videoId: string;
        title: string;
        artist: string;
        thumbnail: string;
        duration: string;
    }>;
    createdAt: string;
}

export default function PlaylistsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { setQueue, setCurrentSong, play, ensurePlayback, setQueueSource } = usePlayerStore();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            fetchPlaylists();
        }
    }, [status, router]);

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

    const handleCreatePlaylist = async (name: string, description: string) => {
        try {
            const res = await fetch("/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            });

            const data = await res.json();
            if (data.success) {
                setPlaylists([data.playlist, ...playlists]);
            } else {
                alert(data.error || "Failed to create playlist");
            }
        } catch (error) {
            console.error("Error creating playlist:", error);
            alert("Failed to create playlist");
        }
    };

    const handleDeletePlaylist = async (playlistId: string) => {
        try {
            const res = await fetch(`/api/playlists?id=${playlistId}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (data.success) {
                setPlaylists(playlists.filter((p) => p._id !== playlistId));
            } else {
                alert(data.error || "Failed to delete playlist");
            }
        } catch (error) {
            console.error("Error deleting playlist:", error);
            alert("Failed to delete playlist");
        }
    };

    const handlePlayPlaylist = async (playlistId: string) => {
        try {
            // Fetch full playlist details with songs
            const res = await fetch(`/api/playlists?id=${playlistId}`);
            const data = await res.json();
            
            if (data.success && data.playlist.songs.length > 0) {
                setQueue(data.playlist.songs);
                setCurrentSong(data.playlist.songs[0]);
                setQueueSource({ type: "playlist", id: playlistId, name: data.playlist.name });
                play();
                ensurePlayback();
            }
        } catch (error) {
            console.error("Error playing playlist:", error);
        }
    };

    const handleImportPlaylist = async (
        tracks: Array<{ title: string; authors: string[]; videoId: string; thumbnail: string; duration?: string }>,
        name: string,
        author: string
    ) => {
        try {
            // First create the playlist
            const createRes = await fetch("/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                    description: `Imported from ${author}`,
                }),
            });

            const createData = await createRes.json();
            if (!createData.success) {
                throw new Error("Failed to create playlist");
            }

            const playlistId = createData.playlist._id;

            // Add all tracks to the playlist
            for (const track of tracks) {
                // Duration is already in MM:SS format from the API
                const durationStr = track.duration || "0:00";

                await fetch(`/api/playlists/${playlistId}/songs`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        videoId: track.videoId,
                        title: track.title,
                        artist: track.authors.join(", "),
                        thumbnail: track.thumbnail,
                        duration: durationStr,
                    }),
                });
            }

            // Refresh playlists
            await fetchPlaylists();
        } catch (error) {
            console.error("Error importing playlist:", error);
            throw error;
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className={styles.playlists}>
                <div className={styles.loading}>Loading playlists...</div>
            </div>
        );
    }

    return (
        <div className={styles.playlists}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1 className={styles.title}>My Playlists</h1>
                    <div className={styles.headerActions}>
                        <button
                            className={styles.createBtn}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus size={20} />
                            Create Playlist
                        </button>
                        <button
                            className={`${styles.createBtn} ${styles.importBtn}`}
                            onClick={() => setIsImportModalOpen(true)}
                        >
                            <Download size={20} />
                            Import
                        </button>
                    </div>
                </div>
                <p className={styles.subtitle}>
                    Create and manage your custom playlists
                </p>
            </div>

            <div className={styles.content}>
                {playlists.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <Music size={40} />
                        </div>
                        <div>
                            <h2 className={styles.emptyTitle}>No playlists yet</h2>
                            <p className={styles.emptyText}>
                                Create your first playlist and start organizing your favorite songs
                            </p>
                        </div>
                        <button
                            className={styles.createBtn}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus size={20} />
                            Create Your First Playlist
                        </button>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {playlists.map((playlist) => (
                            <PlaylistCard
                                key={playlist._id}
                                playlist={playlist}
                                onDelete={handleDeletePlaylist}
                                onPlay={handlePlayPlaylist}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />

            <ImportPlaylistModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportPlaylist}
            />
        </div>
    );
}
