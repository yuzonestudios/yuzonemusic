import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISong {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
    addedAt: Date;
}

export interface IPlaylist extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    songs: ISong[];
    thumbnail?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SongSchema = new Schema<ISong>({
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
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

const PlaylistSchema = new Schema<IPlaylist>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        songs: [SongSchema],
        thumbnail: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Create compound index for efficient user playlist queries
PlaylistSchema.index({ userId: 1, createdAt: -1 });

// Prevent model recompilation in development
const Playlist: Model<IPlaylist> =
    mongoose.models.Playlist || mongoose.model<IPlaylist>("Playlist", PlaylistSchema);

export default Playlist;
