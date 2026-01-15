"use client";

import { useUTMTracking } from "@/hooks/useUTMTracking";

export function UTMTracker({ children }: { children: React.ReactNode }) {
    useUTMTracking();
    return <>{children}</>;
}
