"use client";

import { useEffect, useState, useRef, useCallback, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import { Download, Heart, Maximize, ListPlus, ListMusic, X, GripVertical, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlayerStore } from "@/store/playerStore";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import AddToPlaylistModal from "@/components/ui/AddToPlaylistModal";
import styles from "./MusicPlayer.module.css";

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getVibeTag(song?: { title: string; artist: string }) {
    if (!song) return { id: "idle", label: "No Vibe" };
    const text = `${song.title} ${song.artist}`.toLowerCase();
    const vibeRules = [
        { id: "chill", label: "Chill", keywords: ["chill", "lofi", "lo-fi", "ambient", "relax", "calm", "mellow", "soft", "sleep", "study"] },
        { id: "energy", label: "Energy", keywords: ["energy", "workout", "dance", "edm", "party", "club", "boost", "fast", "rock", "trap"] },
        { id: "night", label: "Night", keywords: ["night", "midnight", "moon", "dusk", "dawn", "late", "drive", "city", "neon"] },
        { id: "focus", label: "Focus", keywords: ["focus", "study", "instrumental", "acoustic"] },
    ];

    for (const rule of vibeRules) {
        if (rule.keywords.some((keyword) => text.includes(keyword))) {
            return { id: rule.id, label: rule.label };
        }
    }

    return { id: "for-you", label: "For You" };
}

export default function MusicPlayer() {
    const {
        currentSong,
        isPlaying,
        volume,
        currentTime,
        duration,
        repeat,
        shuffle,
        togglePlay,
        nextSong,
        previousSong,
        setVolume,
        toggleRepeat,
        toggleShuffle,
        openFullscreen,
        seekTo,
        queue,
        queueIndex,
        setCurrentSong,
        moveInQueue,
        removeFromQueue,
        clearQueue,
    } = usePlayerStore();

    const { seek } = useAudioPlayer();
    useKeyboardShortcuts();
    usePlayerSync();
    const [isLiked, setIsLiked] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const queuePanelRef = useRef<HTMLDivElement>(null);
    const queueToggleRef = useRef<HTMLButtonElement>(null);
    const historyPostedRef = useRef<string | null>(null);
    const lastSongRef = useRef<typeof currentSong | null>(null);
    const lastListenRef = useRef(0);
    const sessionIdRef = useRef<string | null>(null);
    const lastProgressRef = useRef(0);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: isMobile
                ? { delay: 180, tolerance: 8 }
                : { distance: 4 },
        })
    );

    useEffect(() => {
        if (typeof window === "undefined") return;
        const media = window.matchMedia("(max-width: 768px)");
        const handleChange = () => setIsMobile(media.matches);
        handleChange();
        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    // Close queue when clicking outside
    useEffect(() => {
        if (!isQueueOpen) return;

        const handleClickOutside = (event: MouseEvent | Event) => {
            const target = event.target as Node;
            
            // Check if click is outside queue panel and not on the toggle button
            if (
                queuePanelRef.current &&
                !queuePanelRef.current.contains(target) &&
                queueToggleRef.current &&
                !queueToggleRef.current.contains(target)
            ) {
                setIsQueueOpen(false);
            }
        };

        // Add listener with a small delay to prevent immediate closing
        const timeoutId = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isQueueOpen]);

    // Store the seek function in the store for FullscreenPlayer to use
    useEffect(() => {
        seekTo as any; // Just to reference it
        // We'll use a ref to avoid dependency issues
    }, [seekTo]);

    const handleSeek = (time: number) => {
        seek(time);
        seekTo(time);
    };

    const handlePlayerTap = (event: MouseEvent<HTMLElement>) => {
        if (!isMobile || !currentSong) return;
        const target = event.target as HTMLElement;
        if (target.closest("button") || target.closest("a") || target.closest("input")) return;
        openFullscreen();
    };

    const postHistory = useCallback(async (song: typeof currentSong | null, listenDuration: number) => {
        if (!song) return;
        if (listenDuration < 20) return;
        if (!sessionIdRef.current && historyPostedRef.current === song.videoId) return;
        if (!sessionIdRef.current) {
            historyPostedRef.current = song.videoId;
        }

        try {
            const res = await fetch("/api/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...song,
                    listenDuration,
                    sessionId: sessionIdRef.current,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                console.error("Failed to track history:", res.status, error);
            }
        } catch (e) {
            console.error("Error tracking history:", e);
        }
    }, []);

    const LOCAL_LISTEN_SECONDS_KEY_PREFIX = "yuzone_listen_local_seconds";
    const LISTEN_MINUTES_COOKIE_PREFIX = "yuzone_listen_minutes";

    const getListenMonthKey = () => {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return month;
    };

    const getLocalListenSecondsKey = () => {
        return `${LOCAL_LISTEN_SECONDS_KEY_PREFIX}_${getListenMonthKey()}`;
    };

    const getListeningCookieKey = () => {
        return `${LISTEN_MINUTES_COOKIE_PREFIX}_${getListenMonthKey()}`;
    };

    const readLocalListenSeconds = () => {
        if (typeof window === "undefined") return 0;
        try {
            const key = getLocalListenSecondsKey();
            const value = window.localStorage.getItem(key);
            const parsed = Number.parseInt(value || "0", 10);
            return Number.isFinite(parsed) ? parsed : 0;
        } catch (e) {
            return 0;
        }
    };

    const writeLocalListenSeconds = (seconds: number) => {
        if (typeof window === "undefined") return;
        try {
            const key = getLocalListenSecondsKey();
            window.localStorage.setItem(key, String(Math.max(0, Math.floor(seconds))));
        } catch (e) {
            // Ignore storage errors
        }
    };

    const writeListeningMinutesCookie = (minutes: number) => {
        if (typeof document === "undefined") return;
        const cookieKey = getListeningCookieKey();
        const expires = new Date();
        expires.setDate(expires.getDate() + 40);
        document.cookie = `${cookieKey}=${encodeURIComponent(minutes)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    };

    // Track song play in history & Check Like Status
    useEffect(() => {
        if (currentSong) {
            console.log("Tracking song:", currentSong);
            historyPostedRef.current = null;
            lastSongRef.current = currentSong;
            lastListenRef.current = 0;
            sessionIdRef.current = `${currentSong.videoId}-${Date.now()}`;
            lastProgressRef.current = 0;
            
            // 1. Check if liked
            const checkLike = async () => {
                try {
                    const res = await fetch(`/api/liked?check=${currentSong.videoId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            setIsLiked(data.isLiked);
                        }
                    } else {
                        const error = await res.json();
                        console.error("Failed to check like status:", res.status, error);
                    }
                } catch (e) {
                    console.error("Error checking like status:", e);
                }
            };
            checkLike();

            return () => {
                if (lastSongRef.current?.videoId === currentSong.videoId) {
                    postHistory(lastSongRef.current, Math.floor(lastListenRef.current));
                }
            };
        }
    }, [currentSong?.videoId, postHistory]);

    useEffect(() => {
        if (!currentSong) return;
        if (currentTime > lastListenRef.current) {
            lastListenRef.current = currentTime;
        }
    }, [currentTime, currentSong?.videoId]);

    useEffect(() => {
        if (!currentSong || !isPlaying) return;

        const tick = () => {
            const delta = Math.max(0, currentTime - lastProgressRef.current);
            if (delta > 0) {
                const totalSeconds = readLocalListenSeconds() + Math.floor(delta);
                writeLocalListenSeconds(totalSeconds);
                const minutes = Math.round(totalSeconds / 60);
                writeListeningMinutesCookie(minutes);
                window.dispatchEvent(
                    new CustomEvent("listenMinutesLocal", {
                        detail: { minutes, seconds: totalSeconds },
                    })
                );
            }
            lastProgressRef.current = currentTime;
        };

        const intervalId = setInterval(tick, 5000);
        return () => clearInterval(intervalId);
    }, [currentSong?.videoId, isPlaying, currentTime]);

    useEffect(() => {
        if (!currentSong || !isPlaying) return;

        const intervalId = setInterval(() => {
            postHistory(currentSong, Math.floor(lastListenRef.current));
        }, 60000);

        return () => clearInterval(intervalId);
    }, [currentSong, isPlaying, postHistory]);

    useEffect(() => {
        return () => {
            if (lastSongRef.current) {
                postHistory(lastSongRef.current, Math.floor(lastListenRef.current));
            }
        };
    }, [postHistory]);

    const toggleLike = async () => {
        if (!currentSong) return;

        const newLiked = !isLiked;
        setIsLiked(newLiked);

        try {
            if (newLiked) {
                const res = await fetch("/api/liked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(currentSong),
                });
                
                if (!res.ok) {
                    console.error("Failed to like song:", res.status);
                    setIsLiked(!newLiked); // Revert on error
                } else {
                    // Dispatch custom event for other components to listen
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: currentSong.videoId, liked: true }
                    }));
                }
            } else {
                const res = await fetch(`/api/liked?videoId=${currentSong.videoId}`, {
                    method: "DELETE",
                });
                
                if (!res.ok) {
                    console.error("Failed to unlike song:", res.status);
                    setIsLiked(!newLiked); // Revert on error
                } else {
                    // Dispatch custom event for other components to listen
                    window.dispatchEvent(new CustomEvent('songLiked', { 
                        detail: { videoId: currentSong.videoId, liked: false }
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to toggle like:", error);
            setIsLiked(!newLiked); // Revert on error
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        handleSeek(percent * duration);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;
    const vibe = getVibeTag(currentSong || undefined);

    const handleQueuePlay = (index: number) => {
        if (!queue[index]) return;
        setCurrentSong(queue[index]);
    };

    const queueIds = queue.map((item, idx) => `${item.videoId}-${idx}`);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const fromIndex = queueIds.indexOf(String(active.id));
        const toIndex = queueIds.indexOf(String(over.id));

        if (fromIndex === -1 || toIndex === -1) return;
        moveInQueue(fromIndex, toIndex);
    };

    const SortableQueueItem = ({
        item,
        idx,
        id,
    }: {
        item: typeof queue[number];
        idx: number;
        id: string;
    }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id });

        const style: CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition,
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`${styles.queueItem} ${idx === queueIndex ? styles.active : ""} ${isDragging ? styles.dragging : ""}`}
                // On mobile, allow dragging from the whole row with long-press
                {...(isMobile ? { ...attributes, ...listeners } : {})}
            >
                <button
                    className={styles.queueHandle}
                    aria-label="Drag to reorder"
                    // Desktop: drag via handle; Mobile: whole row already has listeners
                    {...(!isMobile ? { ...attributes, ...listeners } : {})}
                >
                    <GripVertical size={16} />
                </button>
                <button
                    className={styles.queueMeta}
                    onClick={() => handleQueuePlay(idx)}
                    title="Play from queue"
                >
                    <span className={styles.queueItemTitle}>{item.title}</span>
                    <span className={styles.queueItemArtist}>{item.artist}</span>
                </button>
                <div className={styles.queueItemActions}>
                    {/* Move Up/Down for touch-friendly reordering */}
                    <button
                        onClick={() => moveInQueue(idx, Math.max(0, idx - 1))}
                        title="Move up"
                        disabled={idx === 0}
                    >
                        <ChevronUp size={14} />
                    </button>
                    <button
                        onClick={() => moveInQueue(idx, Math.min(queue.length - 1, idx + 1))}
                        title="Move down"
                        disabled={idx === queue.length - 1}
                    >
                        <ChevronDown size={14} />
                    </button>
                    <button
                        onClick={() => removeFromQueue(idx)}
                        title="Remove from queue"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <footer className={styles.player} onClick={handlePlayerTap}>
                <div className={styles.playerInner}>
                    {/* Song Info */}
                    <div className={styles.songInfo}>
                        {currentSong ? (
                            <>
                                <div className={styles.thumbWrap}>
                                    <div className={styles.thumbRing} aria-hidden="true" />
                                    <div className={styles.thumbnail}>
                                        <Image
                                            src={currentSong.thumbnail}
                                            alt={currentSong.title}
                                            width={64}
                                            height={64}
                                            className={styles.thumbnailImg}
                                        />
                                    </div>
                                    {isPlaying && <span className={styles.playPulse} />}
                                </div>
                                <div className={styles.songDetails}>
                                    <div className={styles.vibeRow}>
                                        <span className={styles.vibeTag} data-vibe={vibe.id}>
                                            {vibe.label}
                                        </span>
                                        <span className={styles.personalizedTag}>Personalized</span>
                                    </div>
                                    <span className={styles.songTitle}>{currentSong.title}</span>
                                    <span className={styles.songArtist}>{currentSong.artist}</span>
                                </div>
                                <button
                                    onClick={toggleLike}
                                    className={`${styles.likeBtn} ${isLiked ? styles.active : ""}`}
                                    title={isLiked ? "Unlike" : "Like"}
                                >
                                    <Heart size={20} fill={isLiked ? "var(--accent-primary)" : "none"} stroke={isLiked ? "var(--accent-primary)" : "currentColor"} />
                                </button>
                            </>
                        ) : (
                            <div className={styles.noSong}>
                                <span>No song playing</span>
                            </div>
                        )}
                    </div>

                    {/* Player Controls */}
                    <div className={styles.controls}>
                        <div className={styles.buttons}>
                            <div className={`${styles.playbackViz} ${isPlaying ? styles.active : ""}`} aria-hidden="true">
                                <span />
                                <span />
                                <span />
                                <span />
                            </div>
                        <button
                            onClick={previousSong}
                            className={`${styles.controlBtn} ${styles.secondary}`}
                            disabled={!currentSong}
                            title="Previous"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
                            </svg>
                        </button>

                        <button
                            onClick={togglePlay}
                            className={`${styles.controlBtn} ${styles.primary}`}
                            disabled={!currentSong}
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={nextSong}
                            className={`${styles.controlBtn} ${styles.secondary}`}
                            disabled={!currentSong}
                            title="Next"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                            </svg>
                        </button>

                        <button
                            onClick={toggleShuffle}
                            className={`${styles.controlBtn} ${styles.secondary} ${shuffle ? styles.active : ""}`}
                            disabled={!currentSong}
                            title={shuffle ? "Shuffle: On" : "Shuffle: Off"}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 3 21 3 21 8" />
                                <line x1="4" y1="20" x2="21" y2="3" />
                                <polyline points="21 16 21 21 16 21" />
                                <line x1="15" y1="15" x2="21" y2="21" />
                                <line x1="4" y1="4" x2="9" y2="9" />
                            </svg>
                        </button>

                        <button
                            onClick={toggleRepeat}
                            className={`${styles.controlBtn} ${styles.secondary} ${repeat !== "off" ? styles.active : ""}`}
                            disabled={!currentSong}
                            title={`Repeat: ${repeat}`}
                        >
                            {repeat === "one" ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 1l4 4-4 4" />
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                    <path d="M7 23l-4-4 4-4" />
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                    <text x="12" y="14" fontSize="8" fill="currentColor" textAnchor="middle">1</text>
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 1l4 4-4 4" />
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                    <path d="M7 23l-4-4 4-4" />
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                </svg>
                            )}
                        </button>

                        <a
                            href={currentSong ? `/api/stream?id=${currentSong.videoId}` : "#"}
                            download={currentSong ? `${currentSong.title}.mp4` : undefined}
                            className={`${styles.controlBtn} ${styles.secondary}`}
                            title="Download"
                        >
                            <Download size={18} />
                        </a>
                        <button
                            onClick={() => setIsPlaylistModalOpen(true)}
                            className={`${styles.controlBtn} ${styles.secondary}`}
                            disabled={!currentSong}
                            title="Add to Playlist"
                        >
                            <ListPlus size={18} />
                        </button>

                        <button
                            onClick={openFullscreen}
                            className={`${styles.controlBtn} ${styles.secondary}`}
                            disabled={!currentSong}
                            title="Fullscreen Player"
                        >
                            <Maximize size={18} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className={styles.progressWrapper}>
                        <span className={styles.time}>{formatTime(currentTime)}</span>
                        <div className={styles.progressBar} onClick={handleProgressClick}>
                            <div className={styles.progressBg}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <span className={styles.time}>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className={styles.sideActions}>
                    <button
                        ref={queueToggleRef}
                        className={`${styles.queueToggle} ${isQueueOpen ? styles.active : ""}`}
                        onClick={() => setIsQueueOpen((open) => !open)}
                        title="Open Queue"
                    >
                        <ListMusic size={18} />
                        <span className={styles.queueCount}>{queue.length}</span>
                    </button>

                    <div className={styles.volumeControl}>
                        <button
                            onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
                            className={styles.volumeBtn}
                            title={volume > 0 ? "Mute" : "Unmute"}
                        >
                            {volume === 0 ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            ) : volume < 0.5 ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            )}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className={styles.volumeSlider}
                        />
                    </div>
                </div>
            </div>
            </footer>

            {currentSong && (
                <>
                    <AddToPlaylistModal
                        isOpen={isPlaylistModalOpen}
                        onClose={() => setIsPlaylistModalOpen(false)}
                        song={currentSong}
                    />
                </>
            )}

            {queue.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div ref={queuePanelRef} className={`${styles.queuePanel} ${isQueueOpen ? styles.open : ""}`}>
                        <div className={styles.queueHeader}>
                            <div>
                                <div className={styles.queueTitle}>Queue</div>
                                <div className={styles.queueSubtitle}>Up next · {queue.length} item{queue.length === 1 ? "" : "s"}</div>
                            </div>
                            <div className={styles.queueHeaderActions}>
                                <button
                                    className={styles.clearQueueBtn}
                                    onClick={() => {
                                        clearQueue();
                                        setIsQueueOpen(false);
                                    }}
                                    title="Clear queue"
                                    aria-label="Clear queue"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    className={styles.closeQueue}
                                    onClick={() => setIsQueueOpen(false)}
                                    aria-label="Close queue"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <SortableContext items={queueIds} strategy={verticalListSortingStrategy}>
                            <div className={styles.queueList}>
                                {queue.map((item, idx) => (
                                    <SortableQueueItem
                                        key={queueIds[idx]}
                                        id={queueIds[idx]}
                                        item={item}
                                        idx={idx}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                </DndContext>
            )}
        </>
    );
}
