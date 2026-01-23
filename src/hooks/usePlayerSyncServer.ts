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

const SYNC_INTERVAL = 30000; // Sync every 30 seconds
const SYNC_DEBOUNCE = 5000; // Wait 5 seconds after last change before syncing

export function usePlayerSyncServer() {
    const { data: session, status } = useSession();
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSyncRef = useRef<number>(0);
    const hasLoadedInitialStateRef = useRef(false);

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
        if (now - lastSyncRef.current < 10000) {
            // Don't sync more than once every 10 seconds
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
                    const localStorageDate = parseInt(localStorage.getItem("yuzone-last-played") || "0");

                    if (serverStateDate > localStorageDate) {
                        // Load server state
                        const store = usePlayerStore.getState();
                        
                        if (serverState.currentSong) {
                            store.setCurrentSong(serverState.currentSong);
                        }
                        if (serverState.queue && serverState.queue.length > 0) {
                            store.setQueue(serverState.queue, serverState.queueIndex);
                        }
                        if (serverState.queueSource) {
                            store.setQueueSource(serverState.queueSource);
                        }
                        if (serverState.currentTime) {
                            store.setCurrentTime(serverState.currentTime);
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

                        console.log("✅ Loaded player state from server");
                        localStorage.setItem("yuzone-last-played", serverStateDate.toString());
                    }
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

    // Setup periodic sync
    useEffect(() => {
        if (status !== "authenticated") return;

        syncIntervalRef.current = setInterval(() => {
            syncToServer();
        }, SYNC_INTERVAL);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
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
