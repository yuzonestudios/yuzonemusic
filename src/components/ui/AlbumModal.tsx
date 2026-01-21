"use client";

import { useEffect, useState } from "react";
import styles from "./AlbumModal.module.css";
import { X } from "lucide-react";

interface AlbumModalProps {
  isOpen: boolean;
  browseId: string;
  onClose: () => void;
}

interface AlbumResponseArtist { name: string; browseId: string }
interface AlbumResponseSongArtist { name: string; id?: string }
interface AlbumResponseSong {
  videoId: string;
  title: string;
  artists: AlbumResponseSongArtist[];
  album: string;
  duration: string;
  thumbnail: string;
  isExplicit?: boolean;
  isAvailable?: boolean;
}

interface AlbumResponse {
  browseId: string;
  title: string;
  artists: AlbumResponseArtist[];
  songs: AlbumResponseSong[];
  totalSongs: number;
}

export default function AlbumModal({ isOpen, browseId, onClose }: AlbumModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [album, setAlbum] = useState<AlbumResponse | null>(null);

  useEffect(() => {
    if (!isOpen || !browseId) return;

    const controller = new AbortController();
    const fetchAlbum = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/album?browseId=${encodeURIComponent(browseId)}`, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Status ${res.status}`);
        }
        const data: AlbumResponse = await res.json();
        setAlbum(data);
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setError(e?.message || "Failed to load album");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAlbum();
    return () => controller.abort();
  }, [isOpen, browseId]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Header */}
        <div className={styles.header}>
          {album?.songs?.[0]?.thumbnail && (
            <img src={album.songs[0].thumbnail} alt={album.title} className={styles.cover} />
          )}
          <div className={styles.titleRow}>
            <h3 className={styles.albumTitle}>{album?.title || "Album"}</h3>
            <span className={styles.albumArtists}>{album?.artists?.map(a => a.name).join(", ")}</span>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading && <div>Loading album…</div>}
          {error && !loading && <div style={{ color: "#ef4444" }}>Error: {error}</div>}
          {!loading && !error && album && (
            <div>
              {album.songs.map((s) => (
                <div key={s.videoId} className={styles.songItem}>
                  <img src={s.thumbnail} alt={s.title} className={styles.thumb} />
                  <div>
                    <div className={styles.songTitle}>{s.title}</div>
                    <div className={styles.songMeta}>{s.artists.map(a => a.name).join(", ")}</div>
                  </div>
                  <div className={styles.duration}>{s.duration}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {!loading && album && <span>{album.totalSongs} {album.totalSongs === 1 ? "song" : "songs"}</span>}
        </div>
      </div>
    </div>
  );
}
