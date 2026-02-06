import crypto from "crypto";
import nodemailer from "nodemailer";

export function createVerificationToken() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);
    return { token: code, tokenHash, expiresAt };
}

export async function sendVerificationEmail(email: string, name: string, code: string) {
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
            text: `Hi ${name || "there"},\n\nYour verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn\'t request this, you can ignore this email.`,
            html: `<p>Hi ${name || "there"},</p><p>Your verification code is:</p><h2 style="letter-spacing: 5px; font-size: 32px;">${code}</h2><p>This code will expire in 15 minutes.</p><p>If you didn\'t request this, you can ignore this email.</p>`,
        });
    } catch (error) {
        console.error("SMTP send error:", error);
        throw new Error("SMTP send failed");
    }
}
