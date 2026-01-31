"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Download, Play, Pause, Music } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { usePlayerStore } from "@/store/playerStore";
import type { Song } from "@/types";
import styles from "./share.module.css";

interface SharedContent {
    type: "playlist" | "song";
    data: any;
}

export default function SharePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const { data: session, status } = useSession();
    const isLoggedIn = status === "authenticated";
    
    const [content, setContent] = useState<SharedContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    
    // For non-logged-in users: standalone player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const playlistAudioRef = useRef<HTMLAudioElement>(null);
    
    // For logged-in users: access to the global player store
    const { setQueue, setQueueSource, setCurrentSong } = usePlayerStore();

    useEffect(() => {
        const fetchSharedContent = async () => {
            try {
                const response = await fetch(`/api/share/${token}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to load shared content");
                }
                const data = await response.json();
                console.log("Shared content received:", data);
                setContent(data.content);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchSharedContent();
        }
    }, [token]);

    // Auto-play for logged-in users
    useEffect(() => {
        if (!isLoggedIn || !content || loading) return;

        if (content.type === "song") {
            playSongInMainPlayer(content.data);
            router.push("/dashboard");
        } else if (content.type === "playlist") {
            const playlist = content.data;
            if (playlist && playlist.songs && playlist.songs.length > 0) {
                playPlaylistInMainPlayer(playlist, 0);
                router.push("/dashboard");
            }
        }
    }, [isLoggedIn, content, loading]);

    // Handler for logged-in users to play a single song in the main player
    const playSongInMainPlayer = (song: any) => {
        const playerSong: Song = {
            videoId: song.videoId,
            title: song.title || "Shared Song",
            artist: song.artist || "Unknown Artist",
            thumbnail: song.thumbnail || "/placeholder-album.png",
            duration: song.duration || "0:00",
            album: song.album,
        };
        setCurrentSong(playerSong);
        setQueueSource({ type: "other", name: "Shared Song" });
    };

    // Handler for logged-in users to play a playlist in the main player
    const playPlaylistInMainPlayer = (playlist: any, startIndex = 0) => {
        const songs: Song[] = playlist.songs.map((song: any) => ({
            videoId: song.videoId,
            title: song.title || "Unknown Title",
            artist: song.artist || "Unknown Artist",
            thumbnail: song.thumbnail || "/placeholder-album.png",
            duration: song.duration || "0:00",
            album: song.album,
        }));
        
        if (songs.length > 0) {
            setQueue(songs, startIndex);
            setQueueSource({ 
                type: "playlist", 
                id: playlist._id || null,
                name: playlist.name || "Shared Playlist" 
            });
        }
    };

    if (loading) {
        return (
            <div className={`${styles.container} flex justify-center items-center`}>
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${styles.container}`}>
                <div className={`${styles.errorCard} glass-panel`}>
                    <h1 className={styles.errorTitle}>Unable to Load</h1>
                    <p className={styles.errorMessage}>{error}</p>
                </div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className={`${styles.container}`}>
                <div className={`${styles.errorCard} glass-panel`}>
                    <h1 className={styles.errorTitle}>Content Not Found</h1>
                </div>
            </div>
        );
    }

    // For logged-in users, show loading state while redirecting
    if (isLoggedIn) {
        return (
            <div className={`${styles.container} flex justify-center items-center`}>
                <LoadingSpinner size="large" />
                <p className={styles.description}>
                    Starting playback...
                </p>
            </div>
        );
    }

    // Below this point, user is NOT logged in (non-authenticated users only)
    
    if (content.type === "playlist") {
        const playlist = content.data;

        const togglePlaylistSong = (videoId: string) => {
            if (playlistAudioRef.current) {
                if (playingVideoId === videoId) {
                    playlistAudioRef.current.pause();
                    setPlayingVideoId(null);
                } else {
                    playlistAudioRef.current.src = `/api/stream?id=${videoId}`;
                    playlistAudioRef.current.play().catch((err) => console.error("Play error:", err));
                    setPlayingVideoId(videoId);
                }
            }
        };

        // Sort songs alphabetically by title
        const sortedSongs = [...playlist.songs].sort((a, b) => 
            (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase())
        );

        return (
            <div className={`${styles.container}`}>
                <div className={`${styles.header} glass-panel`}>
                    {playlist.thumbnail && (
                        <img
                            src={playlist.thumbnail}
                            alt={playlist.name}
                            className={styles.thumbnail}
                        />
                    )}
                    <div className={styles.info}>
                        <h1 className={styles.title}>{playlist.name}</h1>
                        {playlist.description && (
                            <p className={styles.description}>{playlist.description}</p>
                        )}
                        <p className={styles.meta}>
                            {playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}
                        </p>
                    </div>
                </div>

                <div className={`${styles.songs} glass-panel`}>
                    <h2 className={styles.songsTitle}>Songs</h2>
                    {playlist.songs.length === 0 ? (
                        <p className={styles.empty}>No songs in this playlist</p>
                    ) : (
                        <div className={styles.songsList}>
                            {sortedSongs.map(
                                (song: any, index: number) => (
                                    <div key={song.videoId} className={styles.songItem}>
                                        <button
                                            className={styles.playSongButton}
                                            onClick={() => togglePlaylistSong(song.videoId)}
                                            title={playingVideoId === song.videoId ? "Pause" : "Play"}
                                        >
                                            {playingVideoId === song.videoId ? (
                                                <Pause size={16} />
                                            ) : (
                                                <Play size={16} fill="currentColor" />
                                            )}
                                        </button>
                                        <div className={styles.songNumber}>{index + 1}</div>
                                        {song.thumbnail && (
                                            <img
                                                src={song.thumbnail}
                                                alt={song.title}
                                                className={styles.songThumbnail}
                                            />
                                        )}
                                        <div className={styles.songInfo}>
                                            <p className={styles.songTitle}>{song.title}</p>
                                            <p className={styles.songArtist}>{song.artist}</p>
                                        </div>
                                        <span className={styles.duration}>{song.duration}</span>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                    <audio
                        ref={playlistAudioRef}
                        onEnded={() => setPlayingVideoId(null)}
                        crossOrigin="anonymous"
                    />
                </div>
            </div>
        );
    }

    if (content.type === "song") {
        const song = content.data;

        const togglePlay = () => {
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play().catch((err) => console.error("Play error:", err));
                }
                setIsPlaying(!isPlaying);
            }
        };

        const handleTimeUpdate = () => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                setDuration(audioRef.current.duration);
            }
        };

        const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newTime = parseFloat(e.target.value);
            setCurrentTime(newTime);
            if (audioRef.current) {
                audioRef.current.currentTime = newTime;
            }
        };

        const formatTime = (seconds: number) => {
            if (!seconds || isNaN(seconds)) return "0:00";
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, "0")}`;
        };

        const downloadUrl = `/api/stream?id=${song.videoId}`;

        return (
            <div className={`${styles.container}`}>
                <div className={`${styles.header} glass-panel`}>
                    <div className={styles.thumbnailWrapper}>
                        {song.thumbnail && song.thumbnail !== "/placeholder-album.png" ? (
                            <img
                                src={song.thumbnail}
                                alt={song.title || "Song"}
                                className={styles.thumbnail}
                            />
                        ) : (
                            <div className={styles.placeholderThumbnail}>
                                <Music size={64} />
                            </div>
                        )}
                    </div>
                    <div className={styles.info}>
                        <h1 className={styles.title}>{song.title || "Shared Song"}</h1>
                        {song.artist && <p className={styles.description}>{song.artist}</p>}
                        {song.duration && <p className={styles.meta}>{song.duration}</p>}
                        
                        <div className={styles.playerSection}>
                            <div className={styles.playerControls}>
                                <button
                                    className={styles.playButton}
                                    onClick={togglePlay}
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause size={24} /> : <Play size={24} fill="white" />}
                                </button>
                                <div className={styles.progressContainer}>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 0}
                                        value={currentTime}
                                        onChange={handleProgressChange}
                                        className={styles.progressBar}
                                    />
                                    <div className={styles.timeDisplay}>
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                            </div>
                            <audio
                                ref={audioRef}
                                src={downloadUrl}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => setIsPlaying(false)}
                                crossOrigin="anonymous"
                            />
                        </div>

                        <div className={styles.actionsRow}>
                            <a
                                className={styles.primaryLink}
                                href={downloadUrl}
                                download={`${song.title || "song"}.mp3`}
                                title="Download"
                            >
                                <Download size={18} />
                                Download
                            </a>
                            <a
                                className={styles.secondaryLink}
                                href={`https://www.youtube.com/watch?v=${song.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open on YouTube
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.container}`}>
            <div className={`${styles.errorCard} glass-panel`}>
                <h1 className={styles.errorTitle}>Content Type Not Supported</h1>
            </div>
        </div>
    );
}
