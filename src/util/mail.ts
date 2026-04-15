import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  requireTLS: true,
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) => {
  await transporter.sendMail({
    from: `"Tide Focus" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reset your Tide Focus password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #02367b; font-size: 24px; margin: 0;">Tide Focus</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Reset your password</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            You requested a password reset for your Tide Focus account.
            Click the button below to set a new password. This link expires in 30 minutes.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #0278a4; color: #ffffff;
                    text-decoration: none; padding: 12px 24px; border-radius: 8px;
                    font-weight: 600; font-size: 15px;">
            Reset password
          </a>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">
            If you didn't request a password reset, you can safely ignore this email.
            This link will stop working after 30 minutes.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
          &copy; ${new Date().getFullYear()} Tide Focus. All rights reserved.
        </p>
      </div>
    `,
    text: `Reset your Tide Focus password.\n\nClick the link below to set a new password. This link expires in 30 minutes.\n\n${resetUrl}\n\nIf you didn't request a password reset, you can safely ignore this email.`,
  });
};
