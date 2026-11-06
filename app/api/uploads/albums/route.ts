import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(roles: string[]) {
  return roles.includes("artist_admin") || roles.includes("super_admin");
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isAuthorized(user.roles)) return NextResponse.json({ error: "Artist access required." }, { status: 403 });
  if (!request.body) return NextResponse.json({ error: "No upload body received." }, { status: 400 });

  const params = request.nextUrl.searchParams;
  const uploadId = params.get("uploadId") ?? "";
  const index = Number(params.get("index"));
  const total = Number(params.get("total"));
  let filename = "album.zip";
  try {
    filename = decodeURIComponent(request.headers.get("x-file-name") ?? filename);
  } catch {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
  }
  if (!/^[a-f0-9-]{20,50}$/i.test(uploadId) || !Number.isSafeInteger(index) || !Number.isSafeInteger(total) || total < 1 || index < 0 || index >= total || !filename.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "Invalid album ZIP upload chunk." }, { status: 400 });
  }

  const tempDir = path.join(process.cwd(), ".uploads", "albums", uploadId);
  await mkdir(tempDir, { recursive: true });
  const partPath = path.join(tempDir, `${String(index).padStart(8, "0")}.part`);
  const output = createWriteStream(partPath, { flags: "wx" });

  try {
    const input = Readable.fromWeb(request.body as never);
    for await (const chunk of input) {
      if (!output.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))) await once(output, "drain");
    }
    await new Promise<void>((resolve, reject) => {
      output.once("error", reject);
      output.end(resolve);
    });

    if (index !== total - 1) return NextResponse.json({ complete: false });

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "albums");
    await mkdir(uploadsDir, { recursive: true });
    const filenameOnDisk = `${randomUUID()}.zip`;
    const destination = path.join(uploadsDir, filenameOnDisk);
    const firstChunk = path.join(tempDir, "00000000.part");
    const prefixStream = createReadStream(firstChunk, { start: 0, end: 3 });
    let signature = Buffer.alloc(0);
    for await (const chunk of prefixStream) signature = Buffer.concat([signature, Buffer.from(chunk)]);
    if (signature.length < 4 || signature[0] !== 0x50 || signature[1] !== 0x4b) {
      await rm(tempDir, { recursive: true, force: true });
      return NextResponse.json({ error: "The selected file is not a ZIP archive." }, { status: 400 });
    }

    const assembled = createWriteStream(destination, { flags: "wx" });
    try {
      for (let part = 0; part < total; part++) {
        for await (const chunk of createReadStream(path.join(tempDir, `${String(part).padStart(8, "0")}.part`))) {
          if (!assembled.write(chunk)) await once(assembled, "drain");
        }
      }
      await new Promise<void>((resolve, reject) => {
        assembled.once("error", reject);
        assembled.end(resolve);
      });
    } catch (error) {
      assembled.destroy();
      await rm(destination, { force: true });
      throw error;
    }
    await rm(tempDir, { recursive: true, force: true });
    return NextResponse.json({ complete: true, storedPath: `/uploads/albums/${filenameOnDisk}` });
  } catch (error) {
    output.destroy();
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    console.error("Album ZIP upload failed", error);
    return NextResponse.json({ error: "Album ZIP upload failed." }, { status: 500 });
  }
}
