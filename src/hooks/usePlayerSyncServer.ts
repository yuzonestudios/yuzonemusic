"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// Generate a unique device ID for this browser
function getDeviceId(): string {
    if (typeof window === "undefined") return "";
    
    let deviceId = localStorage.getItem("yuzone-device-id");
    if (!deviceId) {
        deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("yuzone-device-id", deviceId);
    }
    return deviceId;
}


export function usePlayerSyncServer() {
    const { data: session, status } = useSession();
    const lastSyncRef = useRef<number>(0);
    const hasLoadedInitialStateRef = useRef(false);
    const lastServerTimestampRef = useRef<number>(0);

    // Get current player state from store
    const getPlayerState = () => {
        const { usePlayerStore } = require("@/store/playerStore");
        const state = usePlayerStore.getState();
        return {
            currentSong: state.currentSong,
            queue: state.queue,
            queueIndex: state.queueIndex,
            queueSource: state.queueSource,
            currentTime: state.currentTime,
            volume: state.volume,
            repeat: state.repeat,
            shuffle: state.shuffle,
            playbackSpeed: state.playbackSpeed,
        };
    };

    // Sync player state to server
    const syncToServer = async () => {
        if (status !== "authenticated" || !session?.user) return;

        const now = Date.now();
        if (now - lastSyncRef.current < 5000) {
            // Don't sync more than once every 5 seconds
            return;
        }

        try {
            const playerState = getPlayerState();
            const deviceId = getDeviceId();
            const response = await fetch("/api/sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Device-Id": deviceId,
                },
                body: JSON.stringify(playerState),
            });

            if (response.ok) {
                lastSyncRef.current = now;
                localStorage.setItem("yuzone-last-sync", now.toString());
                console.log("✅ Player state synced to server");
            }
        } catch (error) {
            console.error("❌ Failed to sync player state:", error);
        }
    };

    // Load initial state from server when user logs in
    const loadFromServer = async () => {
        if (status !== "authenticated" || !session?.user) return;
        if (hasLoadedInitialStateRef.current) return;

        try {
            const { usePlayerStore } = require("@/store/playerStore");
            const deviceId = getDeviceId();
            const response = await fetch("/api/sync", {
                headers: {
                    "X-Device-Id": deviceId,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.playerState) {
                    const serverState = data.playerState;
                    const serverStateDate = new Date(serverState.lastSyncedAt).getTime();
                    lastServerTimestampRef.current = serverStateDate;

                    const store = usePlayerStore.getState();
                    const localState = getPlayerState();

                    // Prioritize local player state if already playing or queued
                    if (localState.currentSong || localState.queue.length > 0) {
                        console.log("⚠️ Skipping server sync on login (local state present)");
                        return;
                    }

                    // Load on initial login only when local state is empty
                    // Set currentTime FIRST before loading anything
                    if (serverState.currentTime) {
                        store.setCurrentTime(serverState.currentTime);
                    }

                    // Load queue BEFORE song to avoid order issues, with preserveTime=true
                    if (serverState.queue && serverState.queue.length > 0) {
                        store.setQueue(serverState.queue, serverState.queueIndex, true);
                    } else if (serverState.currentSong) {
                        // No queue, just set the song with preserveTime
                        store.setCurrentSong(serverState.currentSong, true);
                    }
                    
                    if (serverState.queueSource) {
                        store.setQueueSource(serverState.queueSource);
                    }
                    if (serverState.volume !== undefined) {
                        store.setVolume(serverState.volume);
                    }
                    if (serverState.repeat) {
                        const modes = ["off", "all", "one"];
                        const currentIndex = modes.indexOf(store.repeat);
                        const targetIndex = modes.indexOf(serverState.repeat);
                        for (let i = currentIndex; i !== targetIndex; i = (i + 1) % 3) {
                            store.toggleRepeat();
                        }
                    }
                    if (serverState.shuffle !== undefined && serverState.shuffle !== store.shuffle) {
                        store.toggleShuffle();
                    }
                    if (serverState.playbackSpeed) {
                        store.setPlaybackSpeed(serverState.playbackSpeed);
                    }

                    // Don't need manual audio seeking anymore - useAudioPlayer handles it
                    console.log("✅ Loaded player state from server on login");
                    localStorage.setItem("yuzone-last-played", serverStateDate.toString());
                }
            }
        } catch (error) {
            console.error("❌ Failed to load player state from server:", error);
        } finally {
            hasLoadedInitialStateRef.current = true;
        }
    };

    // Load state on mount/login
    useEffect(() => {
        if (status === "authenticated" && !hasLoadedInitialStateRef.current) {
            loadFromServer();
        }
    }, [status]);

    // Sync only when a song ends
    useEffect(() => {
        if (status !== "authenticated") return;

        const handleSongEnded = () => {
            // Allow state updates (next song) to settle before syncing
            setTimeout(() => {
                syncToServer();
            }, 250);
        };

        window.addEventListener("yuzone-song-ended", handleSongEnded);

        return () => {
            window.removeEventListener("yuzone-song-ended", handleSongEnded);
        };
    }, [status]);

    // Periodic sync for currentTime (every 30 seconds while playing)
    useEffect(() => {
        if (status !== "authenticated") return;

        const interval = setInterval(() => {
            const { usePlayerStore } = require("@/store/playerStore");
            const state = usePlayerStore.getState();
            
            // Only sync if a song is playing
            if (state.currentSong && state.isPlaying) {
                syncToServer();
            }
        }, 30000); // Sync every 30 seconds

        return () => clearInterval(interval);
    }, [status]);

    // Sync on page unload
    useEffect(() => {
        if (status !== "authenticated") return;

        const handleBeforeUnload = () => {
            // Use sendBeacon for reliable sync on page close
            const deviceId = getDeviceId();
            const playerState = getPlayerState();
            const blob = new Blob([JSON.stringify(playerState)], {
                type: "application/json",
            });
            
            navigator.sendBeacon(
                `/api/sync?deviceId=${deviceId}`,
                blob
            );
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [status]);

    return null;
}
