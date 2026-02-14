"use client";

import { useMemo } from "react";
import { Play, Pause, ListMusic } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import type { PodcastEpisode, Song } from "@/types";
import styles from "./PodcastEpisodeCard.module.css";

interface PodcastEpisodeCardProps {
    episode: PodcastEpisode;
    episodes?: PodcastEpisode[];
    index?: number;
}

function toPlayableEpisode(episode: PodcastEpisode): Song {
    return {
        videoId: `podcast-${episode.feedId}-${episode.episodeId}`,
        title: episode.title,
        artist: episode.podcastAuthor || episode.podcastTitle || "Podcast",
        thumbnail: episode.image || "/placeholder-album.png",
        duration: episode.duration,
        streamUrl: episode.audioUrl,
        contentType: "podcast",
        podcastTitle: episode.podcastTitle,
        episodeId: String(episode.episodeId),
    };
}

export default function PodcastEpisodeCard({ episode, episodes = [episode], index = 0 }: PodcastEpisodeCardProps) {
    const {
        currentSong,
        isPlaying,
        setQueue,
        setQueueSource,
        togglePlay,
        play,
        ensurePlayback,
        setCurrentSong,
    } = usePlayerStore();

    const playableEpisode = useMemo(() => toPlayableEpisode(episode), [episode]);
    const playableEpisodes = useMemo(() => episodes.map(toPlayableEpisode), [episodes]);

    const isCurrent = currentSong?.videoId === playableEpisode.videoId;

    const handlePlay = () => {
        if (isCurrent) {
            togglePlay();
            return;
        }

        if (playableEpisodes.length > 0) {
            setQueue(playableEpisodes, index);
            setQueueSource({ type: "search" });
        } else {
            setCurrentSong(playableEpisode);
            setQueueSource({ type: "search" });
        }

        play();
        setTimeout(() => ensurePlayback(), 50);
    };

    return (
        <div className={`${styles.card} ${isCurrent ? styles.playing : ""}`}>
            <button type="button" className={styles.thumb} onClick={handlePlay} aria-label="Play episode">
                <img
                    src={playableEpisode.thumbnail}
                    alt={playableEpisode.title}
                    className={styles.thumbImg}
                />
                <span className={styles.overlay}>
                    {isCurrent && isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </span>
            </button>
            <div className={styles.info}>
                <div className={styles.title}>{episode.title}</div>
                <div className={styles.meta}>
                    <span className={styles.show}>{episode.podcastAuthor || episode.podcastTitle || "Podcast"}</span>
                    <span className={styles.duration}>{episode.duration}</span>
                </div>
            </div>
            <button type="button" className={styles.queueBtn} onClick={handlePlay} title={isCurrent && isPlaying ? "Pause" : "Play"}>
                {isCurrent && isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
        </div>
    );
}
