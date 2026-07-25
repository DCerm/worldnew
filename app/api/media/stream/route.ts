import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { getSql } from "@/lib/db";
import {
  resolveLocalMediaPath,
  verifySignedMediaStreamUrl,
} from "@/lib/media-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRangeHeader(rangeHeader: string | null, size: number) {
  if (!rangeHeader) {
    return null;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);

  if (!match) {
    return null;
  }

  const start = match[1] ? Math.max(0, Number(match[1])) : 0;
  const end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null;
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  const mediaId = request.nextUrl.searchParams.get("mediaId") ?? "";
  const mode = request.nextUrl.searchParams.get("mode") ?? "preview";
  const expires = Number(request.nextUrl.searchParams.get("expires") ?? "0");
  const signature = request.nextUrl.searchParams.get("signature") ?? "";

  if (
    !verifySignedMediaStreamUrl({
      mediaId,
      mode,
      expires,
      signature,
    })
  ) {
    return NextResponse.json({ error: "Invalid or expired media URL." }, { status: 403 });
  }

  const sql = getSql();

  if (!sql) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
  }

  const rows = await sql<{
    playback_url: string | null;
    media_type: "audio" | "video";
  }[]>`
    select playback_url, media_type
    from media_items
    where id = ${mediaId}
      and status = 'published'
    limit 1
  `;

  const media = rows[0];

  if (!media?.playback_url) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const localPath = resolveLocalMediaPath(media.playback_url);

  if (!localPath) {
    return NextResponse.redirect(media.playback_url, 307);
  }

  if (!existsSync(localPath)) {
    return NextResponse.json({ error: "Media file not found." }, { status: 404 });
  }

  const stats = statSync(localPath);
  const range = parseRangeHeader(request.headers.get("range"), stats.size);
  const start = range?.start ?? 0;
  const end = range?.end ?? stats.size - 1;
  const contentLength = end - start + 1;
  const contentType =
    media.media_type === "video" ? "video/mp4" : "audio/mpeg";

  const stream = createReadStream(localPath, { start, end });

  return new NextResponse(Readable.toWeb(stream) as BodyInit, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(contentLength),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      ...(range
        ? { "Content-Range": `bytes ${start}-${end}/${stats.size}` }
        : {}),
    },
  });
}
