import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlaybackHistory extends Document {
    userId: mongoose.Types.ObjectId;
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    playedAt: Date;
    completedAt?: Date;
    listenDuration: number; // in seconds
}

const PlaybackHistorySchema = new Schema<IPlaybackHistory>(
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
        completedAt: {
            type: Date,
        },
        listenDuration: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Index for analytics queries
PlaybackHistorySchema.index({ userId: 1, playedAt: -1 });
PlaybackHistorySchema.index({ userId: 1, videoId: 1, playedAt: -1 });

const PlaybackHistory: Model<IPlaybackHistory> =
    mongoose.models.PlaybackHistory ||
    mongoose.model<IPlaybackHistory>("PlaybackHistory", PlaybackHistorySchema);

export default PlaybackHistory;
