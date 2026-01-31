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

const SYNC_INTERVAL = 30000; // Sync outbound every 30 seconds
const POLL_INTERVAL = 10000; // Poll for updates from other devices every 10 seconds
const SYNC_DEBOUNCE = 5000; // Wait 5 seconds after last change before syncing

export function usePlayerSyncServer() {
    const { data: session, status } = useSession();
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastSyncRef = useRef<number>(0);
    const lastPollRef = useRef<number>(0);
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

    // Poll for updates from other devices
    const pollForUpdates = async () => {
        if (status !== "authenticated" || !session?.user) return;

        const now = Date.now();
        if (now - lastPollRef.current < 5000) {
            // Don't poll more than once every 5 seconds
            return;
        }

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
                    const serverTimestamp = new Date(serverState.lastSyncedAt).getTime();
                    
                    // Only apply if server state is newer than what we last saw
                    if (serverTimestamp > lastServerTimestampRef.current) {
                        lastServerTimestampRef.current = serverTimestamp;
                        const store = usePlayerStore.getState();
                        
                        // Check if the server state is different from our current state
                        const localState = getPlayerState();
                        const isDifferent = 
                            localState.currentSong?.videoId !== serverState.currentSong?.videoId ||
                            localState.queue.length !== serverState.queue.length ||
                            localState.currentTime !== serverState.currentTime;

                        if (isDifferent) {
                            console.log("📱 Syncing state from another device");
                            
                            if (serverState.currentSong) {
                                store.setCurrentSong(serverState.currentSong);
                            }
                            if (serverState.queue && serverState.queue.length > 0) {
                                store.setQueue(serverState.queue, serverState.queueIndex);
                            }
                            if (serverState.queueSource) {
                                store.setQueueSource(serverState.queueSource);
                            }
                            if (serverState.currentTime !== undefined) {
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
                        }
                    }
                }
            }
        } catch (error) {
            console.error("❌ Failed to poll player state:", error);
        } finally {
            lastPollRef.current = now;
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
                    
                    // Always load on initial login to sync state
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

    // Setup periodic sync and polling
    useEffect(() => {
        if (status !== "authenticated") return;

        // Sync outbound every 30 seconds
        syncIntervalRef.current = setInterval(() => {
            syncToServer();
        }, SYNC_INTERVAL);

        // Poll for updates from other devices every 10 seconds
        pollIntervalRef.current = setInterval(() => {
            pollForUpdates();
        }, POLL_INTERVAL);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
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
