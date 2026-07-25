import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

declare global {
  var __worldnewMailRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
}

function getRateLimitStore() {
  if (!global.__worldnewMailRateLimit) {
    global.__worldnewMailRateLimit = new Map();
  }

  return global.__worldnewMailRateLimit;
}

function getClientKey(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  const forwardedIp = forwardedFor.split(",")[0]?.trim();
  if (forwardedIp) {
    return forwardedIp;
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string) {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

function normalizeAddressField(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const clientKey = getClientKey(req);
    if (isRateLimited(clientKey)) {
      return NextResponse.json(
        { message: "Too many requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    const payload = await req.json();
    const to = normalizeAddressField(payload?.to);
    const cc = normalizeAddressField(payload?.cc);
    const bcc = normalizeAddressField(payload?.bcc);
    const subject = String(payload?.message?.subject ?? "").trim().slice(0, 180);
    const text = String(payload?.message?.text ?? "").trim();
    const html = String(payload?.message?.html ?? "").trim();

    if (!to || (!text && !html)) {
      return NextResponse.json(
        { message: "Missing recipients or message content." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER_HOST,
      port: Number(process.env.SMTP_SERVER_PORT ?? 587),
      secure: String(process.env.SMTP_SERVER_SECURE ?? "").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_SERVER_USERNAME,
        pass: process.env.SMTP_SERVER_PASSWORD,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || "info@worldnew.love",
      to,
      cc,
      bcc,
      subject: subject || "No Subject",
      text: text || undefined,
      html: html || undefined,
    });

    return NextResponse.json(
      { message: "Email sent successfully", messageId: info.messageId },
      { status: 200 }
    );
  } catch (error) {
    const emessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending email:", emessage);
    return NextResponse.json(
      { message: "Failed to send email", error: emessage },
      { status: 500 }
    );
  }
}
