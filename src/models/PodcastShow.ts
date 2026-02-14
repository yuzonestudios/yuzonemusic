import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPodcastShow extends Document {
    feedId: number;
    title: string;
    description?: string;
    author?: string;
    image?: string;
    thumbnail?: string;
    language?: string;
    categories?: string[];
    episodeCount?: number;
    lastUpdateTime?: Date;
    lastCrawlTime?: Date;
    feedUrl?: string;
    website?: string;
    lastIndexedAt: Date;
}

const PodcastShowSchema = new Schema<IPodcastShow>(
    {
        feedId: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        author: {
            type: String,
        },
        image: {
            type: String,
        },
        thumbnail: {
            type: String,
        },
        language: {
            type: String,
        },
        categories: {
            type: [String],
            default: [],
        },
        episodeCount: {
            type: Number,
        },
        lastUpdateTime: {
            type: Date,
        },
        lastCrawlTime: {
            type: Date,
        },
        feedUrl: {
            type: String,
        },
        website: {
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

const PodcastShow: Model<IPodcastShow> =
    mongoose.models.PodcastShow ||
    mongoose.model<IPodcastShow>("PodcastShow", PodcastShowSchema);

export default PodcastShow;
