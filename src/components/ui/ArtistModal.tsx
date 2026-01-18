"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Music, Disc3 } from "lucide-react";
import type { ArtistDetailsResponse } from "@/types/api";
import styles from "./ArtistModal.module.css";

interface ArtistModalProps {
    isOpen: boolean;
    artistName: string;
    onClose: () => void;
}

export default function ArtistModal({
    isOpen,
    artistName,
    onClose,
}: ArtistModalProps) {
    const [artistData, setArtistData] = useState<ArtistDetailsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchArtistData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Search for artist first to get browseId
                const searchResponse = await fetch(`/api/search?q=${encodeURIComponent(artistName)}&type=artists`);
                if (!searchResponse.ok) throw new Error("Failed to search for artist");

                const searchData = await searchResponse.json();
                const artists = searchData.data?.artists || [];

                if (artists.length === 0) {
                    setError("Artist not found");
                    setLoading(false);
                    return;
                }

                // Get the first artist result
                const artistId = artists[0].browseId || artists[0].id;

                // Fetch artist details
                const detailsResponse = await fetch(`/api/artist/${artistId}`);
                if (!detailsResponse.ok) throw new Error("Failed to fetch artist details");

                const detailsData = await detailsResponse.json();
                setArtistData(detailsData.data);
            } catch (err) {
                console.error("Error fetching artist data:", err);
                setError(err instanceof Error ? err.message : "Failed to load artist information");
            } finally {
                setLoading(false);
            }
        };

        fetchArtistData();
    }, [isOpen, artistName]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={24} />
                </button>

                {loading && (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Loading artist information...</p>
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        <p>{error}</p>
                    </div>
                )}

                {artistData && !loading && !error && (
                    <>
                        {/* Artist Header */}
                        <div className={styles.header}>
                            {artistData.thumbnail && (
                                <Image
                                    src={artistData.thumbnail}
                                    alt={artistData.name}
                                    width={200}
                                    height={200}
                                    className={styles.headerImage}
                                />
                            )}
                            <div className={styles.headerInfo}>
                                <h2 className={styles.artistName}>{artistData.name}</h2>
                                {artistData.description && (
                                    <p className={styles.description}>{artistData.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Top Songs */}
                        {artistData.topSongs && artistData.topSongs.length > 0 && (
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <Music size={20} />
                                    <h3>Top Songs</h3>
                                </div>
                                <div className={styles.topSongs}>
                                    {artistData.topSongs.slice(0, 5).map((song, idx) => (
                                        <div key={song.videoId || idx} className={styles.topSong}>
                                            {song.thumbnail && (
                                                <Image
                                                    src={song.thumbnail}
                                                    alt={song.title}
                                                    width={60}
                                                    height={60}
                                                    className={styles.songThumbnail}
                                                />
                                            )}
                                            <div className={styles.songInfo}>
                                                <p className={styles.songTitle}>{song.title}</p>
                                                <p className={styles.songDuration}>{song.duration}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Albums */}
                        {artistData.albums && artistData.albums.length > 0 && (
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <Disc3 size={20} />
                                    <h3>Albums</h3>
                                </div>
                                <div className={styles.albums}>
                                    {artistData.albums.slice(0, 6).map((album, idx) => (
                                        <div key={album.browseId || idx} className={styles.album}>
                                            {album.thumbnail && (
                                                <Image
                                                    src={album.thumbnail}
                                                    alt={album.title}
                                                    width={100}
                                                    height={100}
                                                    className={styles.albumThumbnail}
                                                />
                                            )}
                                            <p className={styles.albumTitle}>{album.title}</p>
                                            {album.year && <p className={styles.albumYear}>{album.year}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Singles */}
                        {artistData.singles && artistData.singles.length > 0 && (
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <Music size={20} />
                                    <h3>Singles</h3>
                                </div>
                                <div className={styles.albums}>
                                    {artistData.singles.slice(0, 6).map((single, idx) => (
                                        <div key={single.browseId || idx} className={styles.album}>
                                            {single.thumbnail && (
                                                <Image
                                                    src={single.thumbnail}
                                                    alt={single.title}
                                                    width={100}
                                                    height={100}
                                                    className={styles.albumThumbnail}
                                                />
                                            )}
                                            <p className={styles.albumTitle}>{single.title}</p>
                                            {single.year && <p className={styles.albumYear}>{single.year}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
