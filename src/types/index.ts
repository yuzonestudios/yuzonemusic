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

// Search results type
export interface SearchResults {
    songs: Song[];
    artists: Artist[];
    albums: Album[];
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
