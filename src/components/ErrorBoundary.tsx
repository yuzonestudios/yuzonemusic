"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Log component stack to help locate production-only errors.
        console.error("[ErrorBoundary] Caught error:", error);
        console.error("[ErrorBoundary] Component stack:", info.componentStack);

        if (typeof window !== "undefined") {
            const payload = {
                message: error?.message || String(error),
                name: error?.name || "Error",
                stack: error?.stack || null,
                componentStack: info.componentStack || null,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
            };

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
            } catch (sendError) {
                console.error("[ErrorBoundary] Failed to report error:", sendError);
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? null;
        }

        return this.props.children;
    }
}
