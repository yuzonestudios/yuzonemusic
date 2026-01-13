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


export async function getTopCharts(country: string = "US"): Promise<YTMusicSong[]> {
    try {
        const yt = await getInnertube();

        // Use the specific getCharts method
        // Note: This returns a complex object with "Top Songs", "Top Videos", "Trending" shelves.
        // We need to parse it.
        // Actually, in some versions it returns an Explore object or similar.
        // Let's print keys if we were debugging, but here we assume standard structure.

        // Actually, let's use Explore which often contains "Top charts".
        // Or getCharts.
        // const charts = await yt.music.getCharts(country); 
        // In recent youtubei.js, getCharts is not on 'music' namespace, it's 'getCharts'.
        // Wait, documentation says: `innertube.getHomeFeed()` etc.
        // `innertube.music.getCharts()` SHOULD exist.

        // If getCharts doesn't exist/work, we fallback to our Playlist strategy but use the CORRECT ID for Global Top 100
        // Top 100 Songs Global: PL4fGSI1pRFnqvJy8oMA7p_J8h5x7Qp9aM
        // Maybe the previous fetch failed due to consent screen?
        // Let's try "Global Top Songs" via search if charts fails.

        // Let's try Explore first, it has "Top charts".
        // But let's stick to the Playlist approach but maybe use a diff ID or debug why it's empty.
        // Empty items usually means the playlist is not found or private.
        // That ID "PL4fGSI1pRFnqvJy8oMA7p_J8h5x7Qp9aM" is correct.

        // Let's try searching for "Top 100 Songs Global" playlist first, then getting it.
        const results = await yt.music.search("Top 100 Songs Global", { type: "playlist" });
        if (results.playlists && results.playlists.contents && results.playlists.contents.length > 0) {
            const firstPlaylist = results.playlists.contents[0] as any;
            if (firstPlaylist.id) {
                const playlist = await yt.music.getPlaylist(firstPlaylist.id);
                if (playlist.items) {
                    const songs: YTMusicSong[] = [];
                    for (const item of playlist.items.slice(0, 20)) {
                        if (item.type === "MusicResponsiveListItem") {
                            const song = item as any;
                            if (song.id && song.title) {
                                // Extract artist from flex columns if 'artists' property is missing
                                // Usually flex_columns[1] contains the artist
                                let artistName = "Unknown Artist";
                                if (song.artists && Array.isArray(song.artists) && song.artists.length > 0) {
                                    artistName = song.artists.map((a: any) => a.name).join(", ");
                                } else if (song.flex_columns && song.flex_columns.length > 1) {
                                    const artistColumn = song.flex_columns[1];
                                    if (artistColumn.title?.runs?.length > 0) {
                                        artistName = artistColumn.title.runs.map((r: any) => r.text).join("");
                                    } else if (artistColumn.title && typeof artistColumn.title === 'object' && 'text' in artistColumn.title) {
                                        // @ts-ignore
                                        artistName = artistColumn.title.text;
                                    }
                                }

                                songs.push({
                                    videoId: song.id,
                                    title: song.title.text || song.title, // Handle title object if needed
                                    artist: artistName,
                                    thumbnail: extractThumbnail(song.thumbnail?.contents),
                                    duration: formatDuration(song.duration?.seconds),
                                    album: song.album?.name,
                                });
                            }
                        }
                    }
                    return songs;
                }
            }
        }

        return [];
    } catch (error) {
        console.error("Error getting top charts:", error);
        return [];
    }
}

// Stream using standard fetch but with strict Android headers
export async function getProxyStream(videoId: string, headers?: Record<string, string>): Promise<Response | null> {
    try {
        const url = await getStreamUrl(videoId);

        if (!url) return null;

        // Use standard fetch without specific mobile client headers to see if it bypasses 403
        return fetch(url, {
            headers: {
                ...headers,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
        });
    } catch (error) {
        console.error("Error creating proxy stream:", error);
        return null;
    }
}

export async function getStreamUrl(videoId: string): Promise<string | null> {
    try {
        const yt = await getInnertube();
        // Use default 'WEB' client which is often more stable for signature extraction
        const info = await yt.getBasicInfo(videoId);

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
