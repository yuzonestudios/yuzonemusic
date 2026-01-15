"use client";

import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import AmbientBackground from "@/components/ui/AmbientBackground";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import PersistentPlayer from "@/components/layout/PersistentPlayer";
import styles from "./layout.module.css";

interface AppLayoutClientProps {
    children: React.ReactNode;
}

/**
 * Client-side wrapper for the app layout.
 * This ensures that player components (MusicPlayer, FullscreenPlayer)
 * remain mounted and don't re-render during client-side navigation,
 * allowing music playback to continue uninterrupted.
 */
export default function AppLayoutClient({ children }: AppLayoutClientProps) {
    return (
        <div className={styles.appLayout}>
            <AmbientBackground />
            <Sidebar />
            <MobileNav />
            <main className={styles.main}>{children}</main>
            <PersistentPlayer />
            <LoadingOverlay />
        </div>
    );
}
