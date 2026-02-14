/**
 * Standardized API Response Types for Yuzone Music API
 */

// Search Response Types
export interface SearchSongResult {
  type: "song";
  title: string;
  artists: string[];
  duration: string;
  thumbnail: string;
  videoId: string;
}

export interface SearchArtistResult {
  type: "artist";
  name: string;
  thumbnail: string;
  browseId: string;
}

export interface SearchAlbumResult {
  type: "album";
  title: string;
  artists: string[];
  year?: string;
  thumbnail: string;
  browseId: string;
}

export interface SearchPodcastShowResult {
  type: "podcast-show";
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

export interface SearchPodcastEpisodeResult {
  type: "podcast-episode";
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

export interface SearchResponse {
  songs?: SearchSongResult[];
  artists?: SearchArtistResult[];
  albums?: SearchAlbumResult[];
  podcasts?: {
    shows: SearchPodcastShowResult[];
    episodes: SearchPodcastEpisodeResult[];
  };
}

// Artist Details Types
export interface ArtistTopSong {
  videoId: string;
  title: string;
  duration: string;
  thumbnail: string;
}

export interface ArtistAlbum {
  browseId: string;
  title: string;
  year?: string;
  thumbnail: string;
  trackCount?: number;
}

export interface ArtistDetailsResponse {
  name: string;
  description?: string;
  thumbnail: string;
  browseId: string;
  topSongs: ArtistTopSong[];
  albums: ArtistAlbum[];
  singles: ArtistAlbum[];
}

// Album Details Types
export interface AlbumArtist {
  name: string;
  browseId: string;
}

export interface AlbumTrack {
  videoId: string;
  title: string;
  artists: string[];
  duration: string;
  thumbnail: string;
}

export interface AlbumDetailsResponse {
  title: string;
  artists: AlbumArtist[];
  year?: string;
  releaseDate?: string;
  thumbnail: string;
  browseId: string;
  description?: string;
  duration: string;
  tracks: AlbumTrack[];
}

// Download Request Types
export interface DownloadRequest {
  videoId: string;
  format?: "mp3" | "wav" | "aac";
  quality?: 1 | 2 | 3; // 1=96kbps, 2=128kbps (default), 3=320kbps
}

// Quality Configuration
export const QUALITY_CONFIG = {
  1: { bitrate: "96k", label: "Low (96 kbps)", description: "For low bandwidth/mobile" },
  2: { bitrate: "128k", label: "Medium (128 kbps)", description: "Default quality" },
  3: { bitrate: "320k", label: "High (320 kbps)", description: "High-quality audio" },
} as const;

// Generic API Response Wrapper
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  timestamp?: string;
}
