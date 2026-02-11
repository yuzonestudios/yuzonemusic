import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SongPlayer from "./SongPlayer";
import styles from "./page.module.css";
import { getSongInfo } from "@/lib/youtube-music";

interface SongPageProps {
    params: { id: string };
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 3600;

function toIsoDuration(time: string) {
    const parts = time.split(":").map((part) => Number.parseInt(part, 10));
    if (parts.length === 2) {
        const [mins, secs] = parts;
        return `PT${mins}M${secs}S`;
    }
    if (parts.length === 3) {
        const [hours, mins, secs] = parts;
        return `PT${hours}H${mins}M${secs}S`;
    }
    return "PT0S";
}

export async function generateMetadata({ params }: SongPageProps): Promise<Metadata> {
    const videoId = typeof params?.id === "string" ? params.id.trim() : "";
    if (!videoId) {
        return {
            title: "Song not found | Yuzone Music",
            robots: { index: false, follow: false },
        };
    }

    const song = await getSongInfo(videoId);

    if (!song) {
        return {
            title: "Song | Yuzone Music",
            description: "Listen on Yuzone Music.",
            alternates: { canonical: new URL(`/song/${videoId}`, siteUrl).toString() },
            robots: { index: false, follow: false },
        };
    }

    const songUrl = new URL(`/song/${song.videoId}`, siteUrl).toString();
    const title = `${song.title} by ${song.artist} | Yuzone Music`;
    const description = `Stream ${song.title} by ${song.artist} on Yuzone Music.`;

    return {
        title,
        description,
        alternates: { canonical: songUrl },
        openGraph: {
            title,
            description,
            url: songUrl,
            type: "music.song",
            images: [{ url: song.thumbnail }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [song.thumbnail],
        },
    };
}

export default async function SongPage({ params }: SongPageProps) {
    const videoId = typeof params?.id === "string" ? params.id.trim() : "";
    if (!videoId) {
        notFound();
    }

    const song = await getSongInfo(videoId);
    const resolvedSong = song ?? {
        videoId,
        title: "Unknown Title",
        artist: "Unknown Artist",
        thumbnail: "/placeholder-album.png",
        duration: "0:00",
    };

    const songUrl = new URL(`/song/${resolvedSong.videoId}`, siteUrl).toString();
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: resolvedSong.title,
        byArtist: {
            "@type": "MusicGroup",
            name: resolvedSong.artist,
        },
        duration: toIsoDuration(resolvedSong.duration),
        url: songUrl,
        image: [resolvedSong.thumbnail],
        inAlbum: resolvedSong.album
            ? {
                  "@type": "MusicAlbum",
                  name: resolvedSong.album,
              }
            : undefined,
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.artwork}>
                    <img src={resolvedSong.thumbnail} alt={`${resolvedSong.title} cover`} />
                </div>
                <div className={styles.content}>
                    <h1 className={styles.title}>{resolvedSong.title}</h1>
                    <p className={styles.artist}>{resolvedSong.artist}</p>
                    <div className={styles.meta}>
                        <span className={styles.metaBadge}>Duration: {resolvedSong.duration}</span>
                        <span className={styles.metaBadge}>Source: YouTube Music</span>
                    </div>
                    <SongPlayer videoId={resolvedSong.videoId} />
                    <p className={styles.footerNote}>
                        Tip: Add "Yuzone Music" to your search to find this track faster.
                    </p>
                </div>
            </div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </div>
    );
}
