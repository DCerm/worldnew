import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

const MEDIA_STREAM_TTL_SECONDS = 2 * 60 * 60;

function getMediaStreamSecret() {
  return (
    process.env.MEDIA_STREAM_SECRET?.trim() ||
    process.env.WORDPRESS_SSO_SECRET?.trim() ||
    ""
  );
}

function base64UrlEncode(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(payload: string) {
  const secret = getMediaStreamSecret();

  if (!secret) {
    throw new Error("MEDIA_STREAM_SECRET or WORDPRESS_SSO_SECRET must be configured.");
  }

  return base64UrlEncode(createHmac("sha256", secret).update(payload).digest());
}

export function normalizePreviewSeconds(value: unknown, fallback = 30) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.max(5, Math.round(parsed));
}

export function createSignedMediaStreamUrl(options: {
  mediaId: string;
  mode: "preview" | "full";
}) {
  const expires = Math.floor(Date.now() / 1000) + MEDIA_STREAM_TTL_SECONDS;
  const payload = `${options.mediaId}|${options.mode}|${expires}`;
  const signature = signPayload(payload);

  return `/api/media/stream?mediaId=${encodeURIComponent(
    options.mediaId
  )}&mode=${options.mode}&expires=${expires}&signature=${encodeURIComponent(
    signature
  )}`;
}

export function verifySignedMediaStreamUrl(options: {
  mediaId: string;
  mode: string;
  expires: number;
  signature: string;
}) {
  if (!options.mediaId || !options.signature || !options.expires) {
    return false;
  }

  if (options.expires < Math.floor(Date.now() / 1000)) {
    return false;
  }

  let expected = "";

  try {
    expected = signPayload(`${options.mediaId}|${options.mode}|${options.expires}`);
  } catch {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(options.signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function resolveLocalMediaPath(playbackUrl: string | null) {
  return resolveLocalUploadPath(playbackUrl);
}

export function resolvePublicMediaAssetUrl(fileUrl: string | null) {
  if (!fileUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  if (!fileUrl.startsWith("/")) {
    return fileUrl;
  }

  // Keep app-local asset paths relative so they always resolve on the current host.
  // This avoids broken posters when NEXT_PUBLIC_APP_URL points to a different env.
  if (fileUrl.startsWith("/uploads/") || fileUrl.startsWith("/api/")) {
    return fileUrl;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "";

  if (!baseUrl) {
    return fileUrl;
  }

  return new URL(fileUrl, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function resolveLocalUploadPath(fileUrl: string | null) {
  if (!fileUrl) {
    return null;
  }

  let pathname = fileUrl.trim();

  if (!pathname) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(pathname)) {
      pathname = new URL(pathname).pathname;
    }
  } catch {
    return null;
  }

  if (!pathname.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = pathname.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", relativePath);
}
