"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Play, Trash2, Music, ArrowLeft, User } from "lucide-react";
import SongCard from "@/components/cards/SongCard";
import { usePlayerStore } from "@/store/playerStore";
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
    const { setQueue, setCurrentSong, togglePlay, isPlaying } = usePlayerStore();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && playlistId) {
            fetchPlaylist();
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
                alert(data.error || "Failed to load playlist");
                router.push("/playlists");
            }
        } catch (error) {
            console.error("Error fetching playlist:", error);
            alert("Failed to load playlist");
            router.push("/playlists");
        } finally {
            setLoading(false);
        }
    };

    const handlePlayPlaylist = () => {
        if (playlist && playlist.songs.length > 0) {
            setQueue(playlist.songs);
            setCurrentSong(playlist.songs[0]);
            if (!isPlaying) {
                togglePlay();
            }
        }
    };

    const handleDeletePlaylist = async () => {
        if (!playlist) return;

        if (!confirm(`Delete playlist "${playlist.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/playlists?id=${playlistId}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (data.success) {
                router.push("/playlists");
            } else {
                alert(data.error || "Failed to delete playlist");
            }
        } catch (error) {
            console.error("Error deleting playlist:", error);
            alert("Failed to delete playlist");
        }
    };

    const handleRemoveSong = async (videoId: string) => {
        if (!playlist) return;

        if (!confirm("Remove this song from the playlist?")) {
            return;
        }

        try {
            const res = await fetch(`/api/playlists/${playlistId}/songs?videoId=${videoId}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (data.success) {
                // Update local state
                setPlaylist({
                    ...playlist,
                    songs: playlist.songs.filter(song => song.videoId !== videoId),
                    songCount: playlist.songCount - 1,
                });
            } else {
                alert(data.error || "Failed to remove song");
            }
        } catch (error) {
            console.error("Error removing song:", error);
            alert("Failed to remove song");
        }
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
                            className={`${styles.secondaryBtn} ${styles.deleteBtn}`}
                            onClick={handleDeletePlaylist}
                        >
                            <Trash2 size={18} />
                            Delete Playlist
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {playlist.songs.length > 0 ? (
                    <>
                        <h2 className={styles.sectionTitle}>Songs</h2>
                        <div className={styles.songList}>
                            {playlist.songs.map((song, index) => (
                                <SongCard
                                    key={`${song.videoId}-${index}`}
                                    song={song}
                                    songs={playlist.songs}
                                    index={index}
                                    showActions={true}
                                    onLike={() => handleRemoveSong(song.videoId)}
                                    isLiked={true}
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
        </div>
    );
}
