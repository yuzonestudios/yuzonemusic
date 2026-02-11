import { Innertube } from "youtubei.js";
import { cache, CACHE_TTL } from "./cache";

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

/**
 * Fetch album details and tracks from YouTube Music by browseId
 */
export async function getAlbumByBrowseId(browseId: string): Promise<{
    browseId: string;
    title: string;
    artists: Array<{ name: string; browseId?: string }>;
    thumbnail: string;
    songs: Array<{
        videoId: string;
        title: string;
        artists: Array<{ name: string; id?: string }>;
        album?: string;
        duration: string;
        thumbnail: string;
        isExplicit?: boolean;
        isAvailable?: boolean;
    }>;
}> {
    const yt = await getInnertube();
    const album: any = await yt.music.getAlbum(browseId);

    // Title and artists from header if available
    const title: string = album?.header?.title?.text || album?.header?.title || album?.title || "Album";
    const headerArtists: Array<{ name: string; id?: string }> = Array.isArray(album?.header?.artists)
        ? album.header.artists.map((a: any) => ({ name: a.name || a.text || "Unknown Artist", id: a.id || a.channel_id }))
        : [];

    const artists = headerArtists.map(a => ({ name: a.name, browseId: a.id }));

    // Thumbnail
    const thumbCandidates = album?.header?.thumbnail?.contents || album?.thumbnail?.contents || [];
    const thumbnail = extractThumbnail(thumbCandidates as Array<{ url: string }>);

    // Tracks
    const items: any[] = (album?.contents?.items || album?.tracks || []);
    const songs = items
        .filter((item: any) => item && (item.type === "MusicResponsiveListItem" || item.id))
        .map((item: any) => {
            const vid = item.id || item.video_id || "";
            const tTitle = item.title?.text || item.title || "Unknown Title";
            const tArtists = Array.isArray(item.artists)
                ? item.artists.map((a: any) => ({ name: a.name || a.text || "Unknown Artist", id: a.id || a.channel_id }))
                : (item.flex_columns && item.flex_columns[1]?.title?.runs
                    ? item.flex_columns[1].title.runs.map((r: any) => ({ name: r.text }))
                    : [{ name: "Unknown Artist" }]);
            const tAlbum = item.album?.name || title;
            const tDuration = formatDuration(item.duration?.seconds);
            const tThumb = extractThumbnail(item.thumbnail?.contents);
            const isExplicit = Boolean(item.is_explicit);
            const isAvailable = item.is_available !== false; // default true

            return {
                videoId: vid,
                title: tTitle,
                artists: tArtists,
                album: tAlbum,
                duration: tDuration,
                thumbnail: tThumb,
                isExplicit,
                isAvailable,
            };
        });

    return {
        browseId,
        title,
        artists,
        thumbnail,
        songs,
    };
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

        if (!url) {
            console.error(`[getProxyStream] No URL found for ${videoId}`);
            return null;
        }

        const response = await fetch(url, {
            headers: {
                ...headers,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
        });

        return response;
    } catch (error: any) {
        console.error("[getProxyStream] Error:", error.message);
        return null;
    }
}

export async function getStreamUrl(videoId: string): Promise<string | null> {
    try {
        if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
            console.error("[getStreamUrl] Invalid videoId:", videoId);
            return null;
        }

        // Check cache first (URLs are valid for ~6 hours)
        const cacheKey = `stream-url:${videoId}`;
        const cached = cache.get<string>(cacheKey);
        if (cached) {
            return cached;
        }

        const yt = await getInnertube();
        const info = await yt.getBasicInfo(videoId.trim());

        const audioFormats = info.streaming_data?.adaptive_formats?.filter(
            (f) => f.has_audio && !f.has_video
        );

        if (audioFormats && audioFormats.length > 0) {
            audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            const bestFormat = audioFormats[0];

            if (bestFormat.url) {
                // Cache the URL
                cache.set(cacheKey, bestFormat.url, CACHE_TTL.STREAM_URL);
                return bestFormat.url;
            }

            if (bestFormat.decipher) {
                const url = bestFormat.decipher(yt.session.player);
                // Cache the deciphered URL
                cache.set(cacheKey, url, CACHE_TTL.STREAM_URL);
                return url;
            }

            console.error(`[getStreamUrl] No URL or decipher method available`);
            return null;
        }

        return null;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("video_id is missing")) {
            console.error("[getStreamUrl] Error getting stream URL:", error);
        }
        return null; // Return null gracefully instead of throwing
    }
}

export async function getSongInfo(videoId: string): Promise<YTMusicSong | null> {
    try {
        if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
            console.error("[getSongInfo] Invalid videoId:", videoId);
            return null;
        }

        // Try external API first (primary source)
        console.log(`[getSongInfo] Trying external API for ${videoId}`);
        const external = await fetchSongInfoFromExternal(videoId);
        if (external) {
            console.log(`[getSongInfo] Got info from external API for ${videoId}:`, external.title);
            // Store in DB for future use
            saveSongToDB(external).catch(() => {});
            return external;
        }

        // Fallback to Innertube
        try {
            const yt = await getInnertube();
            const info = await yt.getBasicInfo(videoId.trim());

            if (info.basic_info) {
                console.log(`[getSongInfo] Got info from Innertube for ${videoId}:`, info.basic_info.title);
                const result = {
                    videoId: info.basic_info.id || videoId,
                    title: info.basic_info.title || "Unknown Title",
                    artist: info.basic_info.author || "Unknown Artist",
                    thumbnail: info.basic_info.thumbnail?.[0]?.url || "/placeholder-album.png",
                    duration: formatDuration(info.basic_info.duration),
                };
                // Store in DB for future use
                saveSongToDB(result).catch(() => {});
                return result;
            }
        } catch (innertubeError: any) {
            const message = innertubeError?.message || String(innertubeError);
            if (!message.includes("video_id is missing")) {
                console.error(`[getSongInfo] Innertube failed for ${videoId}:`, message);
            }
        }

        // Final fallback: check SeoSong DB
        console.log(`[getSongInfo] Trying SeoSong DB for ${videoId}`);
        const fromDB = await getSongInfoFromDB(videoId);
        if (fromDB) {
            console.log(`[getSongInfo] Got info from DB for ${videoId}:`, fromDB.title);
            return fromDB;
        }

        console.error(`[getSongInfo] All methods failed for ${videoId}`);
        return null;
    } catch (error) {
        console.error(`[getSongInfo] Fatal error for ${videoId}:`, error);
        return null;
    }
}

async function fetchSongInfoFromExternal(videoId: string): Promise<YTMusicSong | null> {
    try {
        // Try external API directly (api.yuzone.me)
        const externalApiUrl = `https://api.yuzone.me/search?q=${encodeURIComponent(videoId)}`;
        console.log(`[fetchSongInfoFromExternal] Fetching from: ${externalApiUrl}`);
        
        const response = await fetch(externalApiUrl, {
            headers: {
                "User-Agent": "YuzoneMusic/1.0",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            console.error(`[fetchSongInfoFromExternal] API returned ${response.status}`);
            return null;
        }

        const payload = await response.json();
        console.log(`[fetchSongInfoFromExternal] Response type:`, Array.isArray(payload) ? 'array' : typeof payload);
        
        const results = Array.isArray(payload) ? payload : payload?.results || payload?.songs || [];
        
        if (!results || results.length === 0) {
            console.error(`[fetchSongInfoFromExternal] No results found`);
            return null;
        }

        const match = results.find(
            (song: any) => song?.videoId === videoId || song?.id === videoId
        ) || results[0];

        if (!match) {
            console.error(`[fetchSongInfoFromExternal] No match found in results`);
            return null;
        }

        console.log(`[fetchSongInfoFromExternal] Found match:`, match.title || match.name);

        return {
            videoId: match.videoId || match.id || videoId,
            title: match.title || match.name || "Unknown Title",
            artist: Array.isArray(match.artists)
                ? match.artists.join(", ")
                : match.artist || match.artists || "Unknown Artist",
            thumbnail:
                match.thumbnail || match.thumbnails?.[0]?.url || "/placeholder-album.png",
            duration: match.duration || "0:00",
            album: match.album,
        };
    } catch (error) {
        console.error(`[fetchSongInfoFromExternal] Error:`, error);
        return null;
    }
}

async function getSongInfoFromDB(videoId: string): Promise<YTMusicSong | null> {
    try {
        // Dynamic import to avoid circular dependencies
        const { default: connectDB } = await import("./mongodb");
        const { default: SeoSong } = await import("@/models/SeoSong");

        await connectDB();
        const song = await SeoSong.findOne({ videoId }).lean();

        if (!song) {
            return null;
        }

        return {
            videoId: song.videoId,
            title: song.title,
            artist: song.artist,
            thumbnail: song.thumbnail,
            duration: song.duration,
        };
    } catch (error) {
        console.error(`[getSongInfoFromDB] Error:`, error);
        return null;
    }
}

async function saveSongToDB(song: YTMusicSong): Promise<void> {
    try {
        // Dynamic import to avoid circular dependencies
        const { default: connectDB } = await import("./mongodb");
        const { default: SeoSong } = await import("@/models/SeoSong");

        await connectDB();
        await SeoSong.findOneAndUpdate(
            { videoId: song.videoId },
            {
                $set: {
                    title: song.title,
                    artist: song.artist,
                    thumbnail: song.thumbnail,
                    duration: song.duration,
                    lastPlayedAt: new Date(),
                },
            },
            { upsert: true, new: true }
        );
        console.log(`[saveSongToDB] Saved ${song.videoId} to DB`);
    } catch (error) {
        console.error(`[saveSongToDB] Error:`, error);
    }
}

