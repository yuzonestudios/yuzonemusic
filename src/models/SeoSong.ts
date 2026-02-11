import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISeoSong extends Document {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    lastPlayedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SeoSongSchema = new Schema<ISeoSong>(
    {
        videoId: {
            type: String,
            required: true,
            unique: true,
            index: true,
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
        lastPlayedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const SeoSong: Model<ISeoSong> =
    mongoose.models.SeoSong || mongoose.model<ISeoSong>("SeoSong", SeoSongSchema);

export default SeoSong;
