import { useEffect } from "react";
import { useSession } from "next-auth/react";

interface UTMParams {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
}

// Get or create a session ID stored in localStorage
function getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem("utm_session_id");
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("utm_session_id", sessionId);
    }
    return sessionId;
}

// Parse UTM parameters from URL
function getUTMParams(): UTMParams {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return {
        source: params.get("utm_source") || undefined,
        medium: params.get("utm_medium") || undefined,
        campaign: params.get("utm_campaign") || undefined,
        content: params.get("utm_content") || undefined,
        term: params.get("utm_term") || undefined,
    };
}

// Detect device type
function detectDevice(): "mobile" | "tablet" | "desktop" {
    if (typeof window === "undefined") return "desktop";

    const ua = navigator.userAgent;
    if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
    if (/tablet|ipad/i.test(ua)) return "tablet";
    return "desktop";
}

export function useUTMTracking() {
    const { data: session } = useSession();

    useEffect(() => {
        const trackPageView = async () => {
            try {
                const utm = getUTMParams();

                // Only track if there are UTM parameters or on first load
                // Skip if all UTM params are empty to reduce noise
                if (
                    !utm.source &&
                    !utm.medium &&
                    !utm.campaign &&
                    !utm.content &&
                    !utm.term
                ) {
                    // Optional: track all page views
                    // Uncomment to track all visits
                    // continue to next block
                }

                const sessionId = getOrCreateSessionId();

                const trackingData = {
                    sessionId,
                    utm_source: utm.source,
                    utm_medium: utm.medium,
                    utm_campaign: utm.campaign,
                    utm_content: utm.content,
                    utm_term: utm.term,
                    page: window.location.pathname,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    device: detectDevice(),
                    ipAddress: undefined, // Will be extracted from request on server
                    userId: session?.user?.email,
                };

                // Send tracking data to API
                await fetch("/api/analytics", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(trackingData),
                });
            } catch (error) {
                // Silently fail - don't disrupt user experience
                console.debug("UTM tracking error:", error);
            }
        };

        // Track on mount and whenever route changes
        trackPageView();
    }, [session?.user?.email]);
}
