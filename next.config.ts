import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        // Disable Next image optimizer to avoid 402s from the hosted optimizer service.
        unoptimized: true,
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
        optimizePackageImports: ["lucide-react"],
    },
};

export default nextConfig;
