"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";

// Cross-tab player state sync using BroadcastChannel
export function usePlayerSync() {
    useEffect(() => {
        if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

        const channel = new BroadcastChannel("yuzone-player-sync");
        const sourceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        let applyingRemote = false;

        // Broadcast relevant player state on changes
        const unsubscribe = usePlayerStore.subscribe(
            (state) => {
                if (applyingRemote) return;
                channel.postMessage({
                    sourceId,
                    payload: {
                        currentSong: state.currentSong,
                        queue: state.queue,
                        queueIndex: state.queueIndex,
                        isPlaying: state.isPlaying,
                        currentTime: state.currentTime,
                        volume: state.volume,
                        repeat: state.repeat,
                        shuffle: state.shuffle,
                        playbackSpeed: state.playbackSpeed,
                    },
                });
            },
            (state) => ({
                currentSong: state.currentSong,
                queue: state.queue,
                queueIndex: state.queueIndex,
                isPlaying: state.isPlaying,
                currentTime: state.currentTime,
                volume: state.volume,
                repeat: state.repeat,
                shuffle: state.shuffle,
                playbackSpeed: state.playbackSpeed,
            })
        );

        // Apply incoming state from other tabs
        channel.onmessage = (event) => {
            const { sourceId: incoming, payload } = event.data || {};
            if (!payload || incoming === sourceId) return;

            applyingRemote = true;
            usePlayerStore.setState((state) => ({
                ...state,
                currentSong: payload.currentSong,
                queue: payload.queue,
                queueIndex: payload.queueIndex,
                isPlaying: payload.isPlaying,
                currentTime: payload.currentTime,
                volume: payload.volume,
                repeat: payload.repeat,
                shuffle: payload.shuffle,
                playbackSpeed: payload.playbackSpeed,
            }));
            applyingRemote = false;

            // Keep the audio element aligned on receivers
            const audio = (window as any).__yuzoneAudio as HTMLAudioElement | undefined;
            if (audio) {
                if (Math.abs(audio.currentTime - (payload.currentTime || 0)) > 0.75) {
                    audio.currentTime = payload.currentTime || 0;
                }
                if (typeof payload.playbackSpeed === "number") {
                    audio.playbackRate = payload.playbackSpeed;
                }
                if (typeof payload.volume === "number") {
                    audio.volume = Math.max(0, Math.min(1, payload.volume));
                }
                if (payload.isPlaying) {
                    audio.play().catch(() => undefined);
                } else {
                    audio.pause();
                }
            }
        };

        return () => {
            unsubscribe();
            channel.close();
        };
    }, []);
}
