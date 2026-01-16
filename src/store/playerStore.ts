import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/types";

interface PlayerState {
    currentSong: Song | null;
    queue: Song[];
    queueIndex: number;
    isPlaying: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    repeat: "off" | "all" | "one";
    shuffle: boolean;
    isFullscreenOpen: boolean;
    isLoading: boolean;
    loadingMessage: string;

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
    addToQueue: (song: Song) => void;
    clearQueue: () => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
    openFullscreen: () => void;
    closeFullscreen: () => void;
    setLoading: (isLoading: boolean, message?: string) => void;
    ensurePlayback: () => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            currentSong: null,
            queue: [],
            queueIndex: 0,
            isPlaying: false,
            volume: 0.7,
            currentTime: 0,
            duration: 0,
            repeat: "off",
            shuffle: false,
            isFullscreenOpen: false,
            isLoading: false,
            loadingMessage: "Loading...",

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
                    });
                } else {
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
                const { queue, queueIndex, repeat, shuffle } = get();
                if (queue.length === 0) return;

                let nextIndex: number;

                if (shuffle) {
                    nextIndex = Math.floor(Math.random() * queue.length);
                } else {
                    nextIndex = queueIndex + 1;
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
                const { queue, queueIndex, currentTime } = get();
                if (queue.length === 0) return;

                // If more than 3 seconds into song, restart it
                if (currentTime > 3) {
                    set({ currentTime: 0 });
                    return;
                }

                const prevIndex = queueIndex - 1;
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
                set({
                    queue: songs,
                    queueIndex: startIndex,
                    currentSong: songs[startIndex] || null,
                    isPlaying: songs.length > 0,
                    currentTime: 0,
                });
            },

            addToQueue: (song: Song) => {
                set((state) => ({
                    queue: [...state.queue, song],
                }));
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
        }),
        {
            name: "yuzone-player",
            partialize: (state) => ({
                currentSong: state.currentSong,
                queue: state.queue,
                queueIndex: state.queueIndex,
                volume: state.volume,
                repeat: state.repeat,
                shuffle: state.shuffle,
            }),
        }
    )
);
