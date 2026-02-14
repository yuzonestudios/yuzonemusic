import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPodcastEpisode extends Document {
    episodeId: number;
    feedId: number;
    title: string;
    description?: string;
    image?: string;
    audioUrl?: string;
    duration?: number;
    publishedAt?: Date;
    podcastTitle?: string;
    podcastAuthor?: string;
    guid?: string;
    link?: string;
    lastIndexedAt: Date;
}

const PodcastEpisodeSchema = new Schema<IPodcastEpisode>(
    {
        episodeId: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },
        feedId: {
            type: Number,
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        image: {
            type: String,
        },
        audioUrl: {
            type: String,
        },
        duration: {
            type: Number,
        },
        publishedAt: {
            type: Date,
        },
        podcastTitle: {
            type: String,
        },
        podcastAuthor: {
            type: String,
        },
        guid: {
            type: String,
        },
        link: {
            type: String,
        },
        lastIndexedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

PodcastEpisodeSchema.index({ feedId: 1, publishedAt: -1 });

const PodcastEpisode: Model<IPodcastEpisode> =
    mongoose.models.PodcastEpisode ||
    mongoose.model<IPodcastEpisode>("PodcastEpisode", PodcastEpisodeSchema);

export default PodcastEpisode;
