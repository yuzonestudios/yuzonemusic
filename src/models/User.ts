import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    name: string;
    displayName?: string;
    image?: string;
    googleId: string;
    theme: string;
    audioQuality?: 1 | 2 | 3;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        displayName: {
            type: String,
        },
        image: {
            type: String,
        },
        googleId: {
            type: String,
            required: true,
            unique: true,
        },
        theme: {
            type: String,
            default: "cyber-blue",
        },
        audioQuality: {
            type: Number,
            enum: [1, 2, 3],
            default: 2,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent model recompilation in development
const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
