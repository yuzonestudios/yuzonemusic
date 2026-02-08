import crypto from "crypto";
import nodemailer from "nodemailer";

export function createVerificationToken() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

  return { token: code, tokenHash, expiresAt };
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string
) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const from = process.env.SMTP_FROM || "no-reply@yuzone.me";
  const fromName = process.env.SMTP_FROM_NAME || "Yuzone Music";
  const fromHeader = `${fromName} <${from}>`;

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
      from: fromHeader,
      to: email,
      subject: "Verify your Yuzone account",

      // Plain text fallback
      text: `Hi ${name || "there"},

Welcome to Yuzone Music 🎶

Your verification code is: ${code}

This code will expire in 15 minutes.

If you didn’t request this, you can safely ignore this email.

— Yuzone Team
`,

      // Futuristic Neon Red HTML Email
      html: `
      <div style="margin:0; padding:0; font-family:Arial, sans-serif; background:#000; color:#fff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#000; padding:50px 0;">
          <tr>
            <td align="center">

              <!-- Outer Glow Card -->
              <table width="600" cellpadding="0" cellspacing="0"
                style="
                  background:rgba(15,15,15,0.96);
                  border-radius:20px;
                  border:1px solid rgba(255,0,60,0.65);
                  box-shadow:0 0 30px rgba(255,0,60,0.45);
                  padding:45px;
                  text-align:center;
                ">

                <!-- Brand -->
                <tr>
                  <td style="
                    font-size:30px;
                    font-weight:bold;
                    color:#ff003c;
                    letter-spacing:4px;
                  ">
                    YUZONE
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:8px; font-size:14px; color:#aaa;">
                    Music. Future. Unlimited.
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:35px 0 10px; font-size:18px; color:#fff;">
                    Hi ${name || "there"},
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="
                    font-size:15px;
                    line-height:24px;
                    color:#ccc;
                    padding:0 20px;
                  ">
                    Thanks for creating your <b style="color:#ff003c;">Yuzone</b> account.  
                    Use the verification code below to complete your signup.
                  </td>
                </tr>

                <!-- OTP -->
                <tr>
                  <td style="padding:35px 0;">
                    <div style="
                      display:inline-block;
                      padding:20px 45px;
                      font-size:36px;
                      font-weight:bold;
                      letter-spacing:12px;
                      color:#ff003c;
                      background:rgba(0,0,0,0.95);
                      border-radius:16px;
                      border:1px solid rgba(255,0,60,0.85);
                      box-shadow:0 0 25px rgba(255,0,60,0.7);
                    ">
                      ${code}
                    </div>
                  </td>
                </tr>

                <!-- Expiry -->
                <tr>
                  <td style="font-size:14px; color:#aaa;">
                    This code expires in <b style="color:#ff003c;">15 minutes</b>.
                  </td>
                </tr>

                <!-- Security Note -->
                <tr>
                  <td style="
                    padding-top:28px;
                    font-size:13px;
                    color:#666;
                    line-height:18px;
                  ">
                    If you didn’t request this email,  
                    you can safely ignore it.
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding-top:40px; font-size:12px; color:#444;">
                    © ${new Date().getFullYear()} Yuzone Music · All rights reserved
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </div>
      `,
    });
  } catch (error) {
    console.error("SMTP send error:", error);
    throw new Error("SMTP send failed");
  }
}