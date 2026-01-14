"use client";

import MusicPlayer from "@/components/player/MusicPlayer";
import FullscreenPlayer from "@/components/player/FullscreenPlayer";

/**
 * PersistentPlayer component that wraps the music player components
 * to ensure they persist across client-side page navigations.
 * This component should be mounted once in a client component
 * that doesn't re-mount on navigation.
 */
export default function PersistentPlayer() {
    return (
        <>
            <MusicPlayer />
            <FullscreenPlayer />
        </>
    );
}
