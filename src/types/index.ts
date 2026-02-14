import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"];
    }
}

// Song type for the application
export interface Song {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    album?: string;
    streamUrl?: string;
    contentType?: "music" | "podcast";
    podcastTitle?: string;
    episodeId?: string;
}

// Artist type
export interface Artist {
    id?: string;
    browseId: string;
    name: string;
    thumbnail: string;
    subscribers?: string;
}

// Album type
export interface Album {
    id?: string;
    browseId: string;
    title: string;
    artists: string[];
    thumbnail: string;
    year?: string;
    trackCount?: number;
}

export interface PodcastShow {
    feedId: number;
    title: string;
    description?: string;
    author?: string;
    image?: string;
    thumbnail?: string;
    language?: string;
    categories?: string[];
    episodeCount?: number;
    website?: string;
}

export interface PodcastEpisode {
    episodeId: number;
    feedId: number;
    title: string;
    description?: string;
    image?: string;
    audioUrl?: string;
    duration: string;
    publishedAt?: string;
    podcastTitle?: string;
    podcastAuthor?: string;
}

// Search results type
export interface SearchResults {
    songs: Song[];
    artists: Artist[];
    albums: Album[];
    podcasts?: {
        shows: PodcastShow[];
        episodes: PodcastEpisode[];
    };
}

// Player state type
export interface PlayerState {
    currentSong: Song | null;
    queue: Song[];
    isPlaying: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    repeat: "off" | "all" | "one";
    shuffle: boolean;
}

// API response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
