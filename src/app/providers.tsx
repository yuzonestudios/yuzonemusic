"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeContext";
import { UTMTracker } from "@/components/UTMTracker";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <UTMTracker>{children}</UTMTracker>
            </ThemeProvider>
        </SessionProvider>
    );
}
