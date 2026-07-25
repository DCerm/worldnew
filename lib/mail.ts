import nodemailer from "nodemailer";

type SendTransactionalEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

type SendTransactionalEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

function getSmtpConfig() {
  const host = process.env.SMTP_SERVER_HOST?.trim();
  const port = Number(process.env.SMTP_SERVER_PORT ?? 587);
  const user = process.env.SMTP_SERVER_USERNAME?.trim();
  const pass = process.env.SMTP_SERVER_PASSWORD?.trim();
  const secure = String(process.env.SMTP_SERVER_SECURE ?? "").toLowerCase() === "true";
  const from = process.env.SMTP_FROM_EMAIL || "info@worldnew.love";

  if (!host || !user || !pass || !Number.isFinite(port)) {
    return null;
  }

  return { host, port, user, pass, secure, from };
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
  const smtp = getSmtpConfig();

  if (!smtp) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    await transporter.sendMail({
      from: smtp.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("sendTransactionalEmail failed", message);
    return { sent: false, reason: "smtp_send_failed" };
  }
}
