"use client";

import { useSession } from "next-auth/react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTheme } from "@/context/ThemeContext";


export default function SettingsPage() {
    const { data: session, status } = useSession();
    const { theme, setTheme } = useTheme();

    if (status === "loading") {
        return <div className="flex justify-center p-12"><LoadingSpinner size="large" /></div>;
    }

    if (!session) {
        return <div className="p-8 text-center">Please sign in to view settings.</div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-white neon-text">Settings</h1>

            <div className="glass-panel p-6 rounded-xl mb-6">
                <h2 className="text-xl font-bold mb-4 text-primary">Account</h2>
                <div className="flex items-center gap-4 mb-4">
                    <img
                        src={session.user?.image || "/placeholder-user.png"}
                        alt="Profile"
                        className="w-16 h-16 rounded-full border-2 border-primary"
                    />
                    <div>
                        <p className="text-lg font-medium text-white">{session.user?.name}</p>
                        <p className="text-gray-400">{session.user?.email}</p>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-xl mb-6">
                <h2 className="text-xl font-bold mb-4 text-primary">Preferences</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-200">Audio Quality</span>
                        <select className="bg-black/40 border border-white/10 rounded px-3 py-1 text-sm text-white">
                            <option value="high">High (AAC 128kbps)</option>
                            <option value="low">Low (Data Saver)</option>
                        </select>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-200">Theme</span>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value as any)}
                            className="bg-black/40 border border-white/10 rounded px-3 py-1 text-sm text-white"
                        >
                            <option value="cyan">Neon Cyan</option>
                            <option value="purple">Neon Purple</option>
                            <option value="orange">Neon Orange</option>
                            <option value="green">Neon Green</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-xl">
                <h2 className="text-xl font-bold mb-4 text-primary">About</h2>
                <p className="text-gray-400 text-sm">
                    Yuzone Music<br />
                    Powered by Next.js 16.1.1 & YouTube Music
                </p>
            </div>
        </div>
    );
}
