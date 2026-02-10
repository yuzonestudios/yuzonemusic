"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Theme = "blood-red" | "toxic-green" | "cyber-blue" | "phonk-purple" | "ambient" | "sunset-orange" | "midnight-black" | "neon-pink" | "ocean-teal" | "crimson-glow" | "forest-night" | "gold-ember" | "custom-image";

type AnimationTheme = "still" | "pulse" | "float" | "shimmer";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => Promise<void>;
    animationTheme: AnimationTheme;
    setAnimationTheme: (theme: AnimationTheme) => Promise<void>;
    customThemeImage: string | null;
    setCustomThemeImage: (image: string | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [theme, setThemeState] = useState<Theme>("phonk-purple");
    const [animationTheme, setAnimationThemeState] = useState<AnimationTheme>("still");
    const [customThemeImage, setCustomThemeImageState] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Load initial theme from server setting
    useEffect(() => {
        const loadTheme = async () => {
            if (session?.user) {
                try {
                    const res = await fetch("/api/settings");
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.data.theme) {
                            setThemeState(data.data.theme);
                            if (data.data.animationTheme) {
                                setAnimationThemeState(data.data.animationTheme);
                            }
                            if (data.data.customThemeImage !== undefined) {
                                setCustomThemeImageState(data.data.customThemeImage);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Failed to load theme:", e);
                }
            }
        };
        loadTheme();
        setMounted(true);
    }, [session]);

    // Apply theme to document
    useEffect(() => {
        if (!mounted) return;
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme, mounted]);

    useEffect(() => {
        if (!mounted) return;
        document.documentElement.setAttribute("data-motion", animationTheme);
    }, [animationTheme, mounted]);

    useEffect(() => {
        if (!mounted) return;
        const imageValue = theme === "custom-image" && customThemeImage
            ? `url("${customThemeImage.replace(/"/g, "\\\"")}")`
            : "none";
        document.documentElement.style.setProperty("--custom-theme-image", imageValue);
    }, [theme, customThemeImage, mounted]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        if (session?.user) {
            try {
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ theme: newTheme }),
                });
            } catch (e) {
                console.error("Failed to save theme:", e);
            }
        }
    };

    const setAnimationTheme = async (newTheme: AnimationTheme) => {
        setAnimationThemeState(newTheme);
        document.documentElement.setAttribute("data-motion", newTheme);

        if (session?.user) {
            try {
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ animationTheme: newTheme }),
                });
            } catch (e) {
                console.error("Failed to save animation theme:", e);
            }
        }
    };

    const setCustomThemeImage = async (image: string | null) => {
        setCustomThemeImageState(image);

        if (session?.user) {
            try {
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customThemeImage: image }),
                });
            } catch (e) {
                console.error("Failed to save custom theme image:", e);
            }
        }
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                animationTheme,
                setAnimationTheme,
                customThemeImage,
                setCustomThemeImage,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
