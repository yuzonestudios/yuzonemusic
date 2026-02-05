"use client";

import { useTheme } from "@/context/ThemeContext";
import { usePlayerStore } from "@/store/playerStore";
import { useMemo, useEffect, useState } from "react";

export default function AmbientBackground() {
    const { theme } = useTheme();
    const { currentSong } = usePlayerStore();
    const [shouldRender, setShouldRender] = useState(false);

    const thumbnail = currentSong?.thumbnail;

    // Only enable ambient background on capable devices
    useEffect(() => {
        const checkPerformance = () => {
            // Check if device supports backdrop-filter (proxy for performance)
            const supportsBackdrop = CSS.supports('backdrop-filter', 'blur(10px)');
            // Check hardware concurrency (CPU cores)
            const cores = navigator.hardwareConcurrency || 2;
            // Only enable on devices with 4+ cores or explicit support
            setShouldRender(supportsBackdrop && cores >= 4);
        };
        
        checkPerformance();
    }, []);

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
        filter: "blur(60px) brightness(0.4)",
        transform: "scale(1.1)",
        transition: "opacity 0.6s ease-in-out",
        opacity: 1,
        contain: "layout style paint"
    }), [thumbnail]);

    if (theme !== "ambient" || !thumbnail || !shouldRender) return null;

    return <div style={style} />;
}
