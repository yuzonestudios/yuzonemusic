import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShare extends Document {
    userId: mongoose.Types.ObjectId;
    contentType: "playlist" | "song";
    contentId: string; // playlist ID or video ID
    shareToken: string;
    expiresAt?: Date;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const ShareSchema = new Schema<IShare>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        contentType: {
            type: String,
            enum: ["playlist", "song"],
            required: true,
        },
        contentId: {
            type: String,
            required: true,
        },
        shareToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            default: null, // null means never expires
            index: { expires: 0 }, // TTL index: MongoDB will auto-delete documents when expiresAt is reached
        },
        viewCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Create compound index for efficient user share queries
ShareSchema.index({ userId: 1, createdAt: -1 });

// Prevent model recompilation in development
const Share: Model<IShare> =
    mongoose.models.Share || mongoose.model<IShare>("Share", ShareSchema);

export default Share;
