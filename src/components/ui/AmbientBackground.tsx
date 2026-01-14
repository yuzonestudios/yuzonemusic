"use client";

import { useTheme } from "@/context/ThemeContext";
import { usePlayerStore } from "@/store/playerStore";

export default function AmbientBackground() {
    const { theme } = useTheme();
    const { currentSong } = usePlayerStore();

    if (theme !== "ambient" || !currentSong) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -2,
                backgroundImage: `url(${currentSong.thumbnail})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(80px) brightness(0.4)",
                transform: "scale(1.2)",
                transition: "background-image 1s ease-in-out"
            }}
        />
    );
}
