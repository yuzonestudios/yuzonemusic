import mongoose, { Schema, Document } from "mongoose";

export interface IUTMTracking extends Document {
    userId?: string;
    sessionId: string;
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    page: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
    timestamp: Date;
    timezone?: string;
    device?: "mobile" | "tablet" | "desktop";
    browser?: string;
    os?: string;
}

const utmTrackingSchema = new Schema<IUTMTracking>(
    {
        userId: {
            type: String,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            index: true,
        },
        source: {
            type: String,
            index: true,
        },
        medium: {
            type: String,
            index: true,
        },
        campaign: {
            type: String,
            index: true,
        },
        content: {
            type: String,
        },
        term: {
            type: String,
        },
        page: {
            type: String,
            required: true,
            index: true,
        },
        referrer: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        ipAddress: {
            type: String,
            index: true,
        },
        timezone: {
            type: String,
        },
        device: {
            type: String,
            enum: ["mobile", "tablet", "desktop"],
        },
        browser: {
            type: String,
        },
        os: {
            type: String,
        },
    },
    {
        timestamps: false,
    }
);

// Add compound index for efficient querying
utmTrackingSchema.index({ timestamp: 1, source: 1 });
utmTrackingSchema.index({ timestamp: 1, medium: 1 });
utmTrackingSchema.index({ timestamp: 1, campaign: 1 });

// Create TTL index to auto-delete old records after 90 days
utmTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.models.UTMTracking ||
    mongoose.model<IUTMTracking>("UTMTracking", utmTrackingSchema);
