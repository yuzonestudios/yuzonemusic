import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlayerState extends Document {
    userId: mongoose.Types.ObjectId;
    currentSong: {
        videoId: string;
        title: string;
        artist: string;
        thumbnail: string;
        duration: string;
    } | null;
    queue: Array<{
        videoId: string;
        title: string;
        artist: string;
        thumbnail: string;
        duration: string;
    }>;
    queueIndex: number;
    queueSource: {
        type: "playlist" | "album" | "search" | "other" | null;
        id: string | null;
        name: string | null;
    };
    currentTime: number;
    volume: number;
    repeat: "off" | "all" | "one";
    shuffle: boolean;
    playbackSpeed: number;
    lastSyncedAt: Date;
    deviceId: string;
}

const PlayerStateSchema = new Schema<IPlayerState>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        currentSong: {
            type: {
                videoId: String,
                title: String,
                artist: String,
                thumbnail: String,
                duration: String,
            },
            default: null,
        },
        queue: {
            type: [
                {
                    videoId: String,
                    title: String,
                    artist: String,
                    thumbnail: String,
                    duration: String,
                },
            ],
            default: [],
        },
        queueIndex: {
            type: Number,
            default: 0,
        },
        queueSource: {
            type: {
                type: String,
                enum: ["playlist", "album", "search", "other", null],
                default: null,
            },
            id: {
                type: String,
                default: null,
            },
            name: {
                type: String,
                default: null,
            },
        },
        currentTime: {
            type: Number,
            default: 0,
        },
        volume: {
            type: Number,
            default: 0.7,
        },
        repeat: {
            type: String,
            enum: ["off", "all", "one"],
            default: "off",
        },
        shuffle: {
            type: Boolean,
            default: false,
        },
        playbackSpeed: {
            type: Number,
            default: 1,
        },
        lastSyncedAt: {
            type: Date,
            default: Date.now,
        },
        deviceId: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
PlayerStateSchema.index({ userId: 1, lastSyncedAt: -1 });

const PlayerState: Model<IPlayerState> =
    mongoose.models.PlayerState ||
    mongoose.model<IPlayerState>("PlayerState", PlayerStateSchema);

export default PlayerState;
