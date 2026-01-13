"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Theme = "blood-red" | "toxic-green" | "cyber-blue" | "phonk-purple";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [theme, setThemeState] = useState<Theme>("cyber-blue");
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

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
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
