"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Simplified Listening Time Sync Hook
 * 
 * Syncs currentTime for each song to user's monthlyListenTimes in database
 * Automatically loads saved time when song starts
 * Automatically saves time every 30 seconds while playing
 */

export function usePlayerSyncServer() {
    const { data: session, status } = useSession();
    const lastSyncRef = useRef<number>(0);
    const currentVideoIdRef = useRef<string | null>(null);
    const syncFailureCountRef = useRef<number>(0);
    const maxSyncFailures = 3;
    const hasLoadedTimeRef = useRef<Set<string>>(new Set());

    // Load saved time for a specific song
    const loadTimeForSong = async (videoId: string) => {
        if (status !== "authenticated" || !session?.user) return;
        if (hasLoadedTimeRef.current.has(videoId)) return; // Already loaded

        try {
            const response = await fetch(`/api/sync?videoId=${videoId}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.currentTime > 0) {
                    const { usePlayerStore } = require("@/store/playerStore");
                    const store = usePlayerStore.getState();
                    
                    // Only apply if this song is still current
                    if (store.currentSong?.videoId === videoId) {
                        // Wait a bit for audio element to be set up
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Verify song is still current after delay
                        const currentState = usePlayerStore.getState();
                        if (currentState.currentSong?.videoId !== videoId) {
                            return; // Song changed, abort
                        }
                        
                        // Update store
                        currentState.setCurrentTime(data.currentTime);
                        
                        // Seek audio element when ready
                        const audio = (window as any).__yuzoneAudio as HTMLAudioElement | undefined;
                        if (!audio) return;
                        
                        const seekWhenReady = () => {
                            // Final check before seeking
                            const finalState = usePlayerStore.getState();
                            if (finalState.currentSong?.videoId === videoId && audio.readyState >= 2) {
                                audio.currentTime = data.currentTime;
                                console.log(`⏱️ Restored ${videoId} to ${data.currentTime}s`);
                            }
                        };
                        
                        if (audio.readyState >= 2) {
                            seekWhenReady();
                        } else {
                            // Wait for audio to be ready
                            const onReady = () => {
                                seekWhenReady();
                                audio.removeEventListener('loadedmetadata', onReady);
                                audio.removeEventListener('canplay', onReady);
                            };
                            audio.addEventListener('loadedmetadata', onReady);
                            audio.addEventListener('canplay', onReady);
                            
                            // Timeout fallback
                            setTimeout(() => {
                                audio.removeEventListener('loadedmetadata', onReady);
                                audio.removeEventListener('canplay', onReady);
                                if (audio.readyState >= 2) seekWhenReady();
                            }, 2000);
                        }
                    }
                }
                hasLoadedTimeRef.current.add(videoId);
            }
        } catch (error) {
            console.warn("⚠️ Failed to load listening time:", error);
            hasLoadedTimeRef.current.add(videoId); // Don't retry
        }
    };

    // Save current time to server
    const saveTimeToServer = async () => {
        if (status !== "authenticated" || !session?.user) return;

        // Stop trying if too many failures
        if (syncFailureCountRef.current >= maxSyncFailures) {
            return;
        }

        const now = Date.now();
        if (now - lastSyncRef.current < 10000) {
            // Don't sync more than once every 10 seconds
            return;
        }

        try {
            const { usePlayerStore } = require("@/store/playerStore");
            const state = usePlayerStore.getState();
            
            // Only sync if a song is playing
            if (!state.currentSong?.videoId || !state.isPlaying || state.currentTime <= 0) {
                return;
            }

            const response = await fetch("/api/sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    videoId: state.currentSong.videoId,
                    currentTime: state.currentTime,
                }),
            });

            if (response.ok) {
                lastSyncRef.current = now;
                syncFailureCountRef.current = 0;
                console.log(`✅ Saved time for ${state.currentSong.videoId}: ${state.currentTime}s`);
            } else {
                syncFailureCountRef.current++;
            }
        } catch (error) {
            syncFailureCountRef.current++;
            if (syncFailureCountRef.current <= 2) {
                console.warn(`⚠️ Sync failed (${syncFailureCountRef.current}/${maxSyncFailures})`);
            }
        }
    };

    // Monitor current song changes and load saved time
    useEffect(() => {
        if (status !== "authenticated") return;

        const { usePlayerStore } = require("@/store/playerStore");
        
        const unsubscribe = usePlayerStore.subscribe((state: any) => {
            const videoId = state.currentSong?.videoId;
            
            if (videoId && videoId !== currentVideoIdRef.current) {
                currentVideoIdRef.current = videoId;
                // Load saved time for this song
                loadTimeForSong(videoId);
            }
        });

        return () => unsubscribe();
    }, [status]);

    // Periodic sync every 30 seconds while playing
    useEffect(() => {
        if (status !== "authenticated") return;

        const interval = setInterval(() => {
            const { usePlayerStore } = require("@/store/playerStore");
            const state = usePlayerStore.getState();
            
            if (state.currentSong && state.isPlaying) {
                saveTimeToServer();
            }
        }, 30000); // Sync every 30 seconds

        return () => clearInterval(interval);
    }, [status]);

    // Save time when song ends
    useEffect(() => {
        if (status !== "authenticated") return;

        const handleSongEnded = () => {
            saveTimeToServer();
        };

        window.addEventListener("yuzone-song-ended", handleSongEnded);

        return () => {
            window.removeEventListener("yuzone-song-ended", handleSongEnded);
        };
    }, [status]);

    // Save time on page unload
    useEffect(() => {
        if (status !== "authenticated") return;

        const handleBeforeUnload = () => {
            try {
                const { usePlayerStore } = require("@/store/playerStore");
                const state = usePlayerStore.getState();
                
                if (state.currentSong?.videoId && state.currentTime > 0) {
                    const blob = new Blob([JSON.stringify({
                        videoId: state.currentSong.videoId,
                        currentTime: state.currentTime,
                    })], {
                        type: "application/json",
                    });
                    
                    navigator.sendBeacon("/api/sync", blob);
                }
            } catch (error) {
                // Silently fail on unload
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [status]);

    return null;
}
