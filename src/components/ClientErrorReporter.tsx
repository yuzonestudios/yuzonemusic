"use client";

import { useEffect } from "react";

function reportError(payload: Record<string, unknown>) {
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], {
                type: "application/json",
            });
            navigator.sendBeacon("/api/error-log", blob);
        } else {
            fetch("/api/error-log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => undefined);
        }
    } catch {
        // Ignore reporting failures to avoid loops.
    }
}

export default function ClientErrorReporter() {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            const error = event.error as Error | undefined;
            reportError({
                type: "error",
                message: error?.message || event.message || "Unknown error",
                name: error?.name || "Error",
                stack: error?.stack || null,
                source: event.filename || null,
                line: event.lineno || null,
                column: event.colno || null,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason as Error | string | undefined;
            reportError({
                type: "unhandledrejection",
                message: typeof reason === "string" ? reason : reason?.message || "Unhandled rejection",
                name: typeof reason === "object" && reason ? (reason as Error).name : "UnhandledRejection",
                stack: typeof reason === "object" && reason ? (reason as Error).stack || null : null,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
            });
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleRejection);
        };
    }, []);

    return null;
}
