import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRecentlyPlayed extends Document {
    userId: mongoose.Types.ObjectId;
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    playedAt: Date;
}

const RecentlyPlayedSchema = new Schema<IRecentlyPlayed>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        videoId: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        artist: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            required: true,
        },
        duration: {
            type: String,
            required: true,
        },
        playedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for querying recent songs efficiently
RecentlyPlayedSchema.index({ userId: 1, playedAt: -1 });

const RecentlyPlayed: Model<IRecentlyPlayed> =
    mongoose.models.RecentlyPlayed ||
    mongoose.model<IRecentlyPlayed>("RecentlyPlayed", RecentlyPlayedSchema);

export default RecentlyPlayed;
