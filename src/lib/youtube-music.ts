import { Innertube } from "youtubei.js";

let innertube: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
    if (!innertube) {
        innertube = await Innertube.create({
            lang: "en",
            location: "US",
            retrieve_player: true,
        });
    }
    return innertube;
}

export interface YTMusicSong {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    album?: string;
}

export interface YTMusicArtist {
    id: string;
    name: string;
    thumbnail: string;
    subscribers?: string;
}

export interface YTMusicAlbum {
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    year?: string;
}

// Helper to safely extract thumbnail
function extractThumbnail(thumbnails: Array<{ url: string }> | undefined): string {
    if (thumbnails && thumbnails.length > 0) {
        const thumb = thumbnails[thumbnails.length - 1];
        return thumb.url.startsWith("//") ? `https:${thumb.url}` : thumb.url;
    }
    return "/placeholder-album.png";
}

// Helper to format duration
function formatDuration(seconds: number | undefined): string {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export async function searchSongs(query: string, limit = 20): Promise<YTMusicSong[]> {
    try {
        const yt = await getInnertube();
        const results = await yt.music.search(query, { type: "song" });

        const songs: YTMusicSong[] = [];

        if (results.songs) {
            const contents = results.songs.contents || [];
            for (const item of contents.slice(0, limit)) {
                if (item.type === "MusicResponsiveListItem") {
                    const song = item as {
                        id?: string;
                        title?: string;
                        artists?: Array<{ name: string }>;
                        thumbnail?: { contents: Array<{ url: string }> };
                        duration?: { seconds: number };
                        album?: { name: string };
                    };

                    if (song.id && song.title) {
                        songs.push({
                            videoId: song.id,
                            title: song.title,
                            artist: song.artists?.map((a) => a.name).join(", ") || "Unknown Artist",
                            thumbnail: extractThumbnail(song.thumbnail?.contents),
                            duration: formatDuration(song.duration?.seconds),
                            album: song.album?.name,
                        });
                    }
                }
            }
        }

        return songs;
    } catch (error) {
        console.error("Error searching songs:", error);
        throw error;
    }
}

export async function searchArtists(query: string, limit = 10): Promise<YTMusicArtist[]> {
    try {
        const yt = await getInnertube();
        const results = await yt.music.search(query, { type: "artist" });

        const artists: YTMusicArtist[] = [];

        if (results.artists) {
            const contents = results.artists.contents || [];
            for (const item of contents.slice(0, limit)) {
                if (item.type === "MusicResponsiveListItem") {
                    const artist = item as {
                        id?: string;
                        name?: string;
                        thumbnail?: { contents: Array<{ url: string }> };
                        subscribers?: string;
                    };

                    if (artist.id && artist.name) {
                        artists.push({
                            id: artist.id,
                            name: artist.name,
                            thumbnail: extractThumbnail(artist.thumbnail?.contents),
                            subscribers: artist.subscribers,
                        });
                    }
                }
            }
        }

        return artists;
    } catch (error) {
        console.error("Error searching artists:", error);
        throw error;
    }
}

export async function searchAlbums(query: string, limit = 10): Promise<YTMusicAlbum[]> {
    try {
        const yt = await getInnertube();
        const results = await yt.music.search(query, { type: "album" });

        const albums: YTMusicAlbum[] = [];

        if (results.albums) {
            const contents = results.albums.contents || [];
            for (const item of contents.slice(0, limit)) {
                if (item.type === "MusicResponsiveListItem") {
                    const album = item as {
                        id?: string;
                        title?: string;
                        artists?: Array<{ name: string }>;
                        thumbnail?: { contents: Array<{ url: string }> };
                        year?: string;
                    };

                    if (album.id && album.title) {
                        albums.push({
                            id: album.id,
                            title: album.title,
                            artist: album.artists?.map((a) => a.name).join(", ") || "Unknown Artist",
                            thumbnail: extractThumbnail(album.thumbnail?.contents),
                            year: album.year,
                        });
                    }
                }
            }
        }

        return albums;
    } catch (error) {
        console.error("Error searching albums:", error);
        throw error;
    }
}

// Stream using the library's built-in downloader which handles signatures/headers
export async function getAudioStream(videoId: string, range?: { start?: number; end?: number }): Promise<ReadableStream<Uint8Array>> {
    try {
        const yt = await getInnertube();
        const stream = await yt.download(videoId, {
            type: 'audio',
            quality: 'best',
            format: 'any',
            range: range ? { start: range.start || 0, end: range.end || -1 } : undefined, // -1 or undefined depending on library, using undefined if supported, or just ignoring range if incomplete
            client: 'ANDROID',
        });
        return stream;
    } catch (error) {
        console.error("Error creating audio stream:", error);
        throw error;
    }
}

export async function getStreamUrl(videoId: string): Promise<string | null> {
    try {
        const yt = await getInnertube();
        // Use 'ANDROID' client which often has fewer signature restrictions for streams
        const info = await yt.getBasicInfo(videoId, 'ANDROID');

        // Get the best audio format
        const audioFormats = info.streaming_data?.adaptive_formats?.filter(
            (f) => f.has_audio && !f.has_video
        );

        if (audioFormats && audioFormats.length > 0) {
            // Sort by bitrate and get the best quality
            audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            const bestFormat = audioFormats[0];

            // If URL is already present (unencrypted), return it
            if (bestFormat.url) {
                return bestFormat.url;
            }

            // Otherwise, decipher it
            if (bestFormat.decipher) {
                return bestFormat.decipher(yt.session.player);
            }

            return null;
        }

        return null;
    } catch (error) {
        console.error("Error getting stream URL:", error);
        return null; // Return null gracefully instead of throwing
    }
}

export async function getSongInfo(videoId: string): Promise<YTMusicSong | null> {
    try {
        const yt = await getInnertube();
        const info = await yt.getBasicInfo(videoId);

        if (info.basic_info) {
            return {
                videoId: info.basic_info.id || videoId,
                title: info.basic_info.title || "Unknown Title",
                artist: info.basic_info.author || "Unknown Artist",
                thumbnail: info.basic_info.thumbnail?.[0]?.url || "/placeholder-album.png",
                duration: formatDuration(info.basic_info.duration),
            };
        }

        return null;
    } catch (error) {
        console.error("Error getting song info:", error);
        throw error;
    }
}
