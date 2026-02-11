import type { MetadataRoute } from "next";
import { getTopCharts } from "@/lib/youtube-music";
import connectDB from "@/lib/mongodb";
import SeoSong from "@/models/SeoSong";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    const urls: MetadataRoute.Sitemap = [
        {
            url: `${siteUrl}/`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${siteUrl}/login`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: `${siteUrl}/signup`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: `${siteUrl}/terms`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.2,
        },
    ];

    try {
        const songs = await getTopCharts();
        songs.slice(0, 100).forEach((song) => {
            urls.push({
                url: `${siteUrl}/song/${song.videoId}`,
                lastModified: now,
                changeFrequency: "weekly",
                priority: 0.6,
            });
        });
    } catch (error) {
        console.error("Sitemap top charts error:", error);
    }

    try {
        await connectDB();
        const playedSongs = await SeoSong.find({})
            .sort({ lastPlayedAt: -1 })
            .limit(50000)
            .select("videoId lastPlayedAt")
            .lean();

        playedSongs.forEach((song: any) => {
            urls.push({
                url: `${siteUrl}/song/${song.videoId}`,
                lastModified: song.lastPlayedAt || now,
                changeFrequency: "weekly",
                priority: 0.7,
            });
        });
    } catch (error) {
        console.error("Sitemap played songs error:", error);
    }

    return urls;
}
