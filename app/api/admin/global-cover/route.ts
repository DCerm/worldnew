import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithToast(request: NextRequest, message: string, type: "success" | "error", returnTo = "/admin") {
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(
    "worldnew_toast",
    encodeURIComponent(JSON.stringify({ id: Date.now(), message, type })),
    { path: "/", sameSite: "lax", httpOnly: false, maxAge: 30 }
  );
  return response;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some((role) => role === "artist_admin" || role === "super_admin")) {
    return NextResponse.redirect(new URL(user ? "/dashboard" : "/login", request.url), 303);
  }

  const sql = getSql();
  if (!sql) {
    return redirectWithToast(request, "Database is unavailable; the global cover was not changed.", "error");
  }

  try {
    const formData = await request.formData();
    const returnTo = request.nextUrl.searchParams.get("returnTo") === "/admin/profile" ? "/admin/profile" : "/admin";
    const image = formData.get("globalCoverImageFile");
    const suppliedUrl = String(formData.get("globalCoverImageUrl") ?? "").trim();
    let coverUrl = suppliedUrl;

    if (image instanceof File && image.size > 0) {
      const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
      const extension = path.extname(image.name).toLowerCase();
      if (image.size > 20 * 1024 * 1024 || !image.type.startsWith("image/") || !allowedExtensions.has(extension)) {
      return redirectWithToast(request, "Choose an image file smaller than 20 MB.", "error", returnTo);
      }
      const filename = `global-cover-${randomUUID()}${extension}`;
      const directory = path.join(process.cwd(), "public", "uploads", "profiles");
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), Buffer.from(await image.arrayBuffer()));
      coverUrl = `/uploads/profiles/${filename}`;
    }

    if (!coverUrl) {
      return redirectWithToast(request, "Choose an image or enter a public image URL.", "error", returnTo);
    }

    await sql`
      insert into app_settings (setting_key, setting_value, updated_by, updated_at)
      values ('global_profile_cover_url', ${coverUrl}, ${user.id}, now())
      on conflict (setting_key) do update
      set setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at
    `;

    return redirectWithToast(request, "Global cover updated.", "success", returnTo);
  } catch (error) {
    console.error("global cover upload failed", error);
    return redirectWithToast(request, "Unable to update the global cover. Please try again.", "error", request.nextUrl.searchParams.get("returnTo") === "/admin/profile" ? "/admin/profile" : "/admin");
  }
}
