import crypto from "crypto";
import nodemailer from "nodemailer";

export function createVerificationToken() {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    return { token, tokenHash, expiresAt };
}

export async function sendVerificationEmail(email: string, name: string, link: string) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "no-reply@yuzone.me";

    if (!host || !port || !user || !pass) {
        throw new Error("SMTP configuration is missing");
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: "Verify your Yuzone account",
            text: `Hi ${name || "there"},\n\nPlease verify your email by clicking the link below:\n${link}\n\nIf you didn\'t request this, you can ignore this email.`,
            html: `<p>Hi ${name || "there"},</p><p>Please verify your email by clicking the link below:</p><p><a href="${link}">Verify my email</a></p><p>If you didn\'t request this, you can ignore this email.</p>`,
        });
    } catch (error) {
        console.error("SMTP send error:", error);
        throw new Error("SMTP send failed");
    }
}
