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
    const song = await getSongInfo(params.id);

    if (!song) {
        return {
            title: "Song not found | Yuzone Music",
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
    const song = await getSongInfo(params.id);

    if (!song) {
        notFound();
    }

    const songUrl = new URL(`/song/${song.videoId}`, siteUrl).toString();
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: song.title,
        byArtist: {
            "@type": "MusicGroup",
            name: song.artist,
        },
        duration: toIsoDuration(song.duration),
        url: songUrl,
        image: [song.thumbnail],
        inAlbum: song.album
            ? {
                  "@type": "MusicAlbum",
                  name: song.album,
              }
            : undefined,
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.artwork}>
                    <img src={song.thumbnail} alt={`${song.title} cover`} />
                </div>
                <div className={styles.content}>
                    <h1 className={styles.title}>{song.title}</h1>
                    <p className={styles.artist}>{song.artist}</p>
                    <div className={styles.meta}>
                        <span className={styles.metaBadge}>Duration: {song.duration}</span>
                        <span className={styles.metaBadge}>Source: YouTube Music</span>
                    </div>
                    <SongPlayer videoId={song.videoId} />
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
