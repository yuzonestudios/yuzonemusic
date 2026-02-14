import type { Song } from "@/types";

export function getPlaybackUrl(song: Song | null): string | null {
    if (!song) return null;
    if (song.streamUrl) {
        return `/api/podcasts/stream?url=${encodeURIComponent(song.streamUrl)}`;
    }
    if (song.videoId) {
        return `/api/stream?id=${encodeURIComponent(song.videoId)}`;
    }
    return null;
}

export function getDownloadName(song: Song | null): string | undefined {
    if (!song) return undefined;
    const extension = song.streamUrl ? "mp3" : "mp4";
    return `${song.title}.${extension}`;
}
