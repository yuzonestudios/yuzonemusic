"use client";

import { useTheme } from "@/context/ThemeContext";
import { usePlayerStore } from "@/store/playerStore";
import { useMemo } from "react";

export default function AmbientBackground() {
    const { theme } = useTheme();
    const { currentSong } = usePlayerStore();

    const thumbnail = currentSong?.thumbnail;

    // Memoize style to prevent unnecessary re-renders
    const style = useMemo(() => ({
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -2,
        backgroundImage: thumbnail ? `url(${thumbnail})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(80px) brightness(0.4)",
        transform: "scale(1.2)",
        transition: "background-image 0.6s ease-in-out",
        willChange: "background-image"
    }), [thumbnail]);

    if (theme !== "ambient" || !thumbnail) return null;

    return <div style={style} />;
}
