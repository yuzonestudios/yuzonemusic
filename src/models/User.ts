import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    name: string;
    image?: string;
    googleId: {
        type: String,
        required: true,
        unique: true,
    };
    theme: string;
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
    },
    {
        timestamps: true,
    }
);

// Prevent model recompilation in development
const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
