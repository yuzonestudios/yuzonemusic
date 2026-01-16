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

        // Request current state from other tabs on join
        channel.postMessage({ sourceId, type: "request-state" });

        // Broadcast relevant player state on changes
        const selector = (state: any) => ({
            currentSong: state.currentSong,
            queue: state.queue,
            queueIndex: state.queueIndex,
            isPlaying: state.isPlaying,
            currentTime: state.currentTime,
            volume: state.volume,
            repeat: state.repeat,
            shuffle: state.shuffle,
            playbackSpeed: state.playbackSpeed,
        });

        const unsubscribe = usePlayerStore.subscribe((state) => {
            if (applyingRemote) return;
            const snapshot = selector(state);
            channel.postMessage({ sourceId, payload: snapshot });
        });

        // Apply incoming state from other tabs or respond to state requests
        channel.onmessage = (event) => {
            const { sourceId: incoming, type, payload } = event.data || {};
            if (incoming === sourceId) return;

            // Handle state request from new tabs
            if (type === "request-state") {
                const state = usePlayerStore.getState();
                channel.postMessage({
                    sourceId,
                    type: "state-response",
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
                return;
            }

            // Handle state updates from other tabs
            if (!payload) return;

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

            // Sync audio element with a small delay to ensure it's ready
            setTimeout(() => {
                const audio = (window as any).__yuzoneAudio as HTMLAudioElement | undefined;
                if (!audio) return;

                if (Math.abs(audio.currentTime - (payload.currentTime || 0)) > 0.75) {
                    audio.currentTime = payload.currentTime || 0;
                }
                if (typeof payload.playbackSpeed === "number") {
                    audio.playbackRate = payload.playbackSpeed;
                }
                if (typeof payload.volume === "number") {
                    audio.volume = Math.max(0, Math.min(1, payload.volume));
                }
                if (payload.isPlaying && audio.paused) {
                    audio.play().catch(() => undefined);
                } else if (!payload.isPlaying && !audio.paused) {
                    audio.pause();
                }
            }, 100);
        };

        return () => {
            unsubscribe();
            channel.close();
        };
    }, []);
}
