import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/types";

interface PlayerState {
    currentSong: Song | null;
    queue: Song[];
    queueIndex: number;
    isPlaying: boolean;
    queueSource: { type: "playlist" | "album" | "search" | "library" | "smart" | "other" | null; id?: string | null; name?: string | null };
    volume: number;
    currentTime: number;
    duration: number;
    repeat: "off" | "all" | "one";
    shuffle: boolean;
    isFullscreenOpen: boolean;
    isLoading: boolean;
    loadingMessage: string;
    playbackSpeed: number;

    // Actions
    setCurrentSong: (song: Song) => void;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    setVolume: (volume: number) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    seekTo: (time: number) => void;
    nextSong: () => void;
    previousSong: () => void;
    setQueue: (songs: Song[], startIndex?: number) => void;
    setQueueSource: (source: { type: "playlist" | "album" | "search" | "library" | "smart" | "other"; id?: string | null; name?: string | null }) => void;
    addToQueue: (song: Song) => void;
    moveInQueue: (fromIndex: number, toIndex: number) => void;
    removeFromQueue: (index: number) => void;
    clearQueue: () => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
    openFullscreen: () => void;
    closeFullscreen: () => void;
    setLoading: (isLoading: boolean, message?: string) => void;
    ensurePlayback: () => void;
    setPlaybackSpeed: (speed: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            currentSong: null,
            queue: [],
            queueIndex: 0,
            isPlaying: false,
            queueSource: { type: null, id: null, name: null },
            volume: 0.7,
            currentTime: 0,
            duration: 0,
            repeat: "off",
            shuffle: false,
            isFullscreenOpen: false,
            isLoading: false,
            loadingMessage: "Loading...",
            playbackSpeed: 1,

            setCurrentSong: (song: Song) => {
                const { queue } = get();
                const index = queue.findIndex((s) => s.videoId === song.videoId);

                // If song is not in queue, start a new queue with just this song
                // This ensures next/prev don't break (though they won't go anywhere with 1 song)
                if (index === -1) {
                    set({
                        currentSong: song,
                        queue: [song],
                        queueIndex: 0,
                        currentTime: 0,
                        isPlaying: true,
                        // Clear playlist context when playing a standalone song without a source
                        queueSource: { type: "other", id: null, name: null },
                    });
                } else {
                    // Song is already in queue, don't modify queueSource
                    set({
                        currentSong: song,
                        queueIndex: index,
                        currentTime: 0,
                        isPlaying: true,
                    });
                }
            },

            play: () => set({ isPlaying: true }),
            pause: () => set({ isPlaying: false }),
            togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

            setVolume: (volume: number) => set({ volume }),
            setCurrentTime: (time: number) => set({ currentTime: time }),
            setDuration: (duration: number) => set({ duration }),
            seekTo: (time: number) => set({ currentTime: time }),

            nextSong: () => {
                const { queue, queueIndex, repeat, shuffle, currentSong } = get();
                if (queue.length === 0) return;

                // Align to the actual current song position when index drifts (e.g., after reordering)
                const currentIdx = currentSong
                    ? queue.findIndex((s) => s.videoId === currentSong.videoId)
                    : -1;
                const baseIndex = currentIdx >= 0 ? currentIdx : queueIndex;
                const safeIndex = Math.min(Math.max(0, baseIndex), queue.length - 1);

                let nextIndex: number;

                if (shuffle) {
                    if (queue.length === 1) {
                        nextIndex = safeIndex;
                    } else {
                        // Pick a different random index to avoid replaying the same track
                        do {
                            nextIndex = Math.floor(Math.random() * queue.length);
                        } while (nextIndex === safeIndex);
                    }
                } else {
                    nextIndex = safeIndex + 1;
                    if (nextIndex >= queue.length) {
                        if (repeat === "all") {
                            nextIndex = 0;
                        } else {
                            set({ isPlaying: false });
                            return;
                        }
                    }
                }

                set({
                    queueIndex: nextIndex,
                    currentSong: queue[nextIndex],
                    currentTime: 0,
                    isPlaying: true,
                });
            },

            previousSong: () => {
                const { queue, queueIndex, currentTime, currentSong } = get();
                if (queue.length === 0) return;

                // If more than 3 seconds into song, restart it
                if (currentTime > 3) {
                    set({ currentTime: 0 });
                    return;
                }

                const currentIdx = currentSong
                    ? queue.findIndex((s) => s.videoId === currentSong.videoId)
                    : -1;
                const baseIndex = currentIdx >= 0 ? currentIdx : queueIndex;
                const safeIndex = Math.min(Math.max(0, baseIndex), queue.length - 1);
                const prevIndex = safeIndex - 1;
                if (prevIndex < 0) {
                    set({ currentTime: 0 });
                    return;
                }

                set({
                    queueIndex: prevIndex,
                    currentSong: queue[prevIndex],
                    currentTime: 0,
                    isPlaying: true,
                });
            },

            setQueue: (songs: Song[], startIndex = 0) => {
                const safeIndex = Math.min(Math.max(0, startIndex), Math.max(0, songs.length - 1));
                set({
                    queue: songs,
                    queueIndex: safeIndex,
                    currentSong: songs[safeIndex] || null,
                    isPlaying: songs.length > 0,
                    currentTime: 0,
                });
            },

            setQueueSource: (source: { type: "playlist" | "album" | "search" | "library" | "smart" | "other"; id?: string | null; name?: string | null }) => {
                set({ queueSource: { type: source.type, id: source.id ?? null, name: source.name ?? null } });
            },

            addToQueue: (song: Song) => {
                set((state) => {
                    const nextQueue = [...state.queue, song];
                    // If nothing is set, make the queued song visible without auto-playing
                    if (!state.currentSong) {
                        return {
                            queue: nextQueue,
                            currentSong: song,
                            queueIndex: state.queue.length,
                        };
                    }

                    return { queue: nextQueue };
                });
            },

            moveInQueue: (fromIndex: number, toIndex: number) => {
                set((state) => {
                    const queue = [...state.queue];
                    if (
                        fromIndex < 0 ||
                        fromIndex >= queue.length ||
                        toIndex < 0 ||
                        toIndex >= queue.length
                    ) {
                        return state;
                    }

                    const [moved] = queue.splice(fromIndex, 1);
                    queue.splice(toIndex, 0, moved);

                    let queueIndex = state.queueIndex;

                    if (fromIndex === state.queueIndex) {
                        queueIndex = toIndex;
                    } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
                        queueIndex -= 1;
                    } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
                        queueIndex += 1;
                    }

                    return {
                        queue,
                        queueIndex,
                        currentSong: queue[queueIndex] || null,
                    };
                });
            },

            removeFromQueue: (index: number) => {
                set((state) => {
                    if (index < 0 || index >= state.queue.length) return state;

                    const queue = [...state.queue];
                    queue.splice(index, 1);

                    let queueIndex = state.queueIndex;

                    if (index < state.queueIndex) {
                        queueIndex -= 1;
                    } else if (index === state.queueIndex) {
                        if (queue.length === 0) {
                            return {
                                queue: [],
                                queueIndex: 0,
                                currentSong: null,
                                isPlaying: false,
                            };
                        }
                        // Stay on same physical position if possible
                        if (queueIndex >= queue.length) {
                            queueIndex = queue.length - 1;
                        }
                    }

                    return {
                        queue,
                        queueIndex,
                        currentSong: queue[queueIndex] || null,
                    };
                });
            },

            clearQueue: () => {
                set({
                    queue: [],
                    queueIndex: 0,
                    currentSong: null,
                    isPlaying: false,
                    currentTime: 0,
                });
            },

            toggleRepeat: () => {
                set((state) => {
                    const modes: ("off" | "all" | "one")[] = ["off", "all", "one"];
                    const currentIndex = modes.indexOf(state.repeat);
                    return { repeat: modes[(currentIndex + 1) % modes.length] };
                });
            },

            toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

            openFullscreen: () => set({ isFullscreenOpen: true }),
            closeFullscreen: () => set({ isFullscreenOpen: false }),
            setLoading: (isLoading: boolean, message = "Loading...") =>
                set({ isLoading, loadingMessage: message }),

            // Best-effort attempt to resume the HTMLAudioElement in response to a user gesture
            ensurePlayback: () => {
                if (typeof window === "undefined") return;
                const audio = (window as any).__yuzoneAudio as HTMLAudioElement | undefined;
                if (!audio) return;

                audio
                    .play()
                    .catch((err) => {
                        console.error("[ensurePlayback] Playback failed:", err?.message || err);
                    });
            },

            setPlaybackSpeed: (speed: number) => {
                set({ playbackSpeed: speed });
                if (typeof window !== "undefined") {
                    const audio = (window as any).__yuzoneAudio as HTMLAudioElement | undefined;
                    if (audio) {
                        audio.playbackRate = speed;
                    }
                }
            },
        }),
        {
            name: "yuzone-player",
            partialize: (state) => ({
                currentSong: state.currentSong,
                queue: state.queue,
                queueIndex: state.queueIndex,
                isPlaying: state.isPlaying,
                queueSource: state.queueSource,
                currentTime: state.currentTime,
                volume: state.volume,
                repeat: state.repeat,
                shuffle: state.shuffle,
                playbackSpeed: state.playbackSpeed,
            }),
        }
    )
);
