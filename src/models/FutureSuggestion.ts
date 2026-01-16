import mongoose, { Schema, Document, models, model } from "mongoose";

export interface FutureSuggestion extends Document {
    userEmail?: string;
    userId?: string;
    suggestion: string;
    createdAt: Date;
}

const FutureSuggestionSchema = new Schema<FutureSuggestion>(
    {
        userEmail: { type: String, index: true },
        userId: { type: String, index: true },
        suggestion: { type: String, required: true, maxlength: 500 },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.FutureSuggestion || model<FutureSuggestion>("FutureSuggestion", FutureSuggestionSchema);
