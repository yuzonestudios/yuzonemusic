"use client";

import { useEffect } from "react";

export default function DeepLinkHandler() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleAppUrlOpen = (event: any) => {
            const url = event.url;
            if (url && url.includes("music.yuzone.me")) {
                window.location.href = url;
            }
        };

        if ((window as any).Capacitor) {
            import("@capacitor/app").then(({ App }) => {
                App.addListener("appUrlOpen", handleAppUrlOpen);
            });
        }

        return () => {
            if ((window as any).Capacitor) {
                import("@capacitor/app").then(({ App }) => {
                    App.removeAllListeners();
                });
            }
        };
    }, []);

    return null;
}
