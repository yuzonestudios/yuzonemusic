import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        // Disable Next image optimizer to avoid 402s from the hosted optimizer service.
        unoptimized: true,
        formats: ['image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "i.ytimg.com",
            },
            {
                protocol: "https",
                hostname: "*.ggpht.com",
            },
            {
                protocol: "https",
                hostname: "music.youtube.com",
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "2mb",
        },
        optimizePackageImports: ["lucide-react", "next-auth"],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === "production" ? {
            exclude: ['error', 'warn']
        } : false,
    },
    reactStrictMode: true,
};

export default nextConfig;
