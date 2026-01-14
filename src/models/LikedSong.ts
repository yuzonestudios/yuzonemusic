import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILikedSong extends Document {
    userId: mongoose.Types.ObjectId;
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    likedAt: Date;
}

const LikedSongSchema = new Schema<ILikedSong>(
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
        likedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient queries
LikedSongSchema.index({ userId: 1, videoId: 1 }, { unique: true });
// Optimization for "Recently Liked" sort
LikedSongSchema.index({ userId: 1, likedAt: -1 });

const LikedSong: Model<ILikedSong> =
    mongoose.models.LikedSong || mongoose.model<ILikedSong>("LikedSong", LikedSongSchema);

export default LikedSong;
