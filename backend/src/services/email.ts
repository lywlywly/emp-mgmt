import nodemailer from "nodemailer";

type SendArgs = { to: string; subject: string; text: string };

// Two modes, selected by EMAIL_MODE:
//   "console" (default) — don't send; log the recipient + body to the console.
//                         Lets the whole flow run without any SMTP config.
//   "smtp"             — send for real using the SMTP_* env vars.
export async function sendEmail({
  to,
  subject,
  text,
}: SendArgs): Promise<void> {
  const mode = process.env.EMAIL_MODE ?? "console";

  if (mode !== "smtp") {
    console.log(`[email:console] to=${to} | subject=${subject}\n${text}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true", // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from =
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@example.com";
  await transporter.sendMail({ from, to, subject, text });
}
