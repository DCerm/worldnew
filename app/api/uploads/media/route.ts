import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeExtension(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitizeStem(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extensionFromUpload(
  filename: string,
  contentType: string,
  mediaType: "audio" | "video" | "image"
) {
  const extFromName = sanitizeExtension(filename.split(".").pop() ?? "");

  if (extFromName) {
    return extFromName;
  }

  if (contentType.startsWith(`${mediaType}/`)) {
    return sanitizeExtension(contentType.replace(`${mediaType}/`, "")) || defaultExtensionFor(mediaType);
  }

  if (mediaType === "image" && contentType.startsWith("image/")) {
    return sanitizeExtension(contentType.replace("image/", "")) || "jpg";
  }

  return defaultExtensionFor(mediaType);
}

function defaultExtensionFor(mediaType: "audio" | "video" | "image") {
  if (mediaType === "audio") {
    return "mp3";
  }

  if (mediaType === "video") {
    return "mp4";
  }

  return "jpg";
}

function isAuthorizedRole(roles: string[]) {
  return roles.includes("artist_admin") || roles.includes("super_admin");
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!isAuthorizedRole(user.roles)) {
    return NextResponse.json({ error: "Artist access required." }, { status: 403 });
  }

  const uploadKind = request.nextUrl.searchParams.get("kind");
  const mediaTypeParam = request.nextUrl.searchParams.get("mediaType");
  const uploadId = sanitizeStem(request.nextUrl.searchParams.get("uploadId") ?? "") || randomUUID();
  const rawFilename = decodeURIComponent(request.headers.get("x-file-name") ?? "upload.bin");
  const contentType = (request.headers.get("content-type") ?? "application/octet-stream").toLowerCase();
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (!request.body) {
    return NextResponse.json({ error: "No upload body received." }, { status: 400 });
  }

  if (uploadKind !== "playback" && uploadKind !== "poster") {
    return NextResponse.json({ error: "Unsupported upload kind." }, { status: 400 });
  }

  const mediaType =
    uploadKind === "poster"
      ? "image"
      : mediaTypeParam === "video"
      ? "video"
      : mediaTypeParam === "audio"
      ? "audio"
      : null;

  if (!mediaType) {
    return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });
  }

  if (uploadKind === "poster") {
    if (contentType && !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Poster uploads must be images." }, { status: 400 });
    }
  } else if (contentType && !contentType.startsWith(`${mediaType}/`)) {
    return NextResponse.json({ error: `Upload must be a ${mediaType} file.` }, { status: 400 });
  }

  const maxBytes = uploadKind === "poster" ? 20 * 1024 * 1024 : 5 * 1024 * 1024 * 1024;

  if (Number.isFinite(contentLength) && contentLength > 0 && contentLength > maxBytes) {
    return NextResponse.json(
      {
        error:
          uploadKind === "poster"
            ? "Poster exceeds the 20 MB limit."
            : "Media file exceeds the 5 GB upload limit.",
      },
      { status: 413 }
    );
  }

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    uploadKind === "poster" ? "posters" : "media"
  );
  await mkdir(uploadsDir, { recursive: true });

  const safeFilenameStem = sanitizeStem(rawFilename.replace(/\.[^.]+$/, "")) || uploadKind;
  const extension = extensionFromUpload(rawFilename, contentType, mediaType);
  const storedFilename = `${uploadId}-${Date.now()}-${safeFilenameStem}.${extension}`;
  const destination = path.join(uploadsDir, storedFilename);
  const storedPath = `/uploads/${uploadKind === "poster" ? "posters" : "media"}/${storedFilename}`;

  const input = Readable.fromWeb(request.body as never);
  const output = createWriteStream(destination, { flags: "wx" });

  let bytesWritten = 0;

  try {
    for await (const chunk of input) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytesWritten += buffer.length;

      if (bytesWritten > maxBytes) {
        throw new Error("upload_limit_exceeded");
      }

      if (!output.write(buffer)) {
        await once(output, "drain");
      }
    }

    output.end();
    await once(output, "finish");
  } catch (error) {
    input.destroy();
    output.destroy();
    await rm(destination, { force: true }).catch(() => undefined);

    if (error instanceof Error && error.message === "upload_limit_exceeded") {
      return NextResponse.json(
        {
          error:
            uploadKind === "poster"
              ? "Poster exceeds the 20 MB limit."
              : "Media file exceeds the 5 GB upload limit.",
        },
        { status: 413 }
      );
    }

    console.error("media upload failed", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    storedPath,
    bytesWritten,
    uploadKind,
  });
}
