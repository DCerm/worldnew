"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  clearSession,
  createSession,
  getDashboardDestination,
  hashPassword,
  requireAdmin,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { getSql } from "@/lib/db";

type ToastLevel = "success" | "error" | "info";
export type ActionOutcome = {
  ok: boolean;
  message: string;
  type: ToastLevel;
};

function requireDatabase() {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return sql;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeExtension(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extensionFromFile(file: File, mediaType: "audio" | "video") {
  const filename = file.name || "";
  const extFromName = sanitizeExtension(filename.split(".").pop() ?? "");

  if (extFromName) {
    return extFromName;
  }

  const mime = file.type.toLowerCase();

  if (mime.startsWith("audio/")) {
    return sanitizeExtension(mime.replace("audio/", "")) || "mp3";
  }

  if (mime.startsWith("video/")) {
    return sanitizeExtension(mime.replace("video/", "")) || "mp4";
  }

  return mediaType === "audio" ? "mp3" : "mp4";
}

async function setToast(message: string, type: ToastLevel = "success") {
  const cookieStore = await cookies();
  const payload = encodeURIComponent(
    JSON.stringify({
      message,
      type,
      id: Date.now(),
    })
  );

  cookieStore.set("worldnew_toast", payload, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 30,
  });
}

async function saveUploadedMediaFile(
  mediaId: string,
  mediaType: "audio" | "video",
  file: FormDataEntryValue | null
) {
  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  const maxBytes = 1024 * 1024 * 1024; // 1 GB safety cap
  if (file.size > maxBytes) {
    return null;
  }

  if (file.type && !file.type.startsWith(`${mediaType}/`)) {
    return null;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "media");
  await mkdir(uploadsDir, { recursive: true });

  const extension = extensionFromFile(file, mediaType);
  const filename = `${mediaId}.${extension}`;
  const destination = path.join(uploadsDir, filename);
  const bytes = await file.arrayBuffer();

  await writeFile(destination, Buffer.from(bytes));

  return `/uploads/media/${filename}`;
}

export async function registerAction(formData: FormData) {
  const sql = requireDatabase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawUsername = String(formData.get("username") ?? "").trim();
  const username = slugify(rawUsername || displayName || email.split("@")[0]);

  if (!username || !email || password.length < 8) {
    await setToast(
      "Please complete all fields with a password of at least 8 characters.",
      "error"
    );
    redirect(
      "/register?error=Please complete all fields with a password of at least 8 characters."
    );
  }

  const existing = await sql<{ id: string }[]>`
    select id from users where email = ${email} limit 1
  `;

  if (existing[0]) {
    await setToast("That email already has an account. Sign in instead.", "error");
    redirect(
      "/login?error=That email already has an account. Sign in instead."
    );
  }

  const userId = randomUUID();

  await sql.begin(async (tx) => {
    await tx`
      insert into users (id, email, username, password_hash, status, display_name)
      values (${userId}, ${email}, ${username || null}, ${hashPassword(password)}, 'active', ${displayName})
    `;

    const memberRole = await tx<{ id: string }[]>`
      select id from roles where code = 'member' limit 1
    `;

    if (memberRole[0]) {
      await tx`
        insert into user_roles (user_id, role_id)
        values (${userId}, ${memberRole[0].id})
        on conflict do nothing
      `;
    }
  });

  await createSession(userId);
  await setToast("Account created. Welcome to World New Community.");
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const sql = requireDatabase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // ── Local database authentication ───────────────────────────────────────
  const rows = await sql<{
    id: string;
    password_hash: string | null;
    roles: string[] | null;
    display_name: string | null;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    cover_image_url: string | null;
    active_plan_code: string | null;
  }[]>`
    select
      u.id,
      u.password_hash,
      u.display_name,
      u.username,
      u.bio,
      u.avatar_url,
      u.cover_image_url,
      coalesce(array_agg(distinct r.code::text) filter (where r.code is not null), '{}'::text[]) as roles,
      (
        select mp.code::text
        from user_subscriptions us
        join membership_plans mp on mp.id = us.membership_plan_id
        where us.user_id = u.id
          and us.status = 'active'
          and (us.ends_at is null or us.ends_at > now())
        order by us.starts_at desc
        limit 1
      ) as active_plan_code
    from users u
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    where u.email = ${email}
    group by u.id
    limit 1
  `;

  const user = rows[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    await setToast("Invalid email or password.", "error");
    redirect("/login?error=Invalid email or password.");
  }

  await createSession(user.id);
  await setToast("Signed in successfully.");

  // redirect() is fine here — we are navigating entirely within the Next.js
  // app so no cross-origin cookie dance is needed.
  redirect(
    getDashboardDestination({
      id: user.id,
      email,
      displayName: user.display_name ?? email.split("@")[0],
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      coverImageUrl: user.cover_image_url,
      roles: user.roles ?? [],
      activePlanCode: user.active_plan_code,
    })
  );
}

export async function logoutAction() {
  await clearSession();
  await setToast("Signed out.", "info");
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const hasBio = formData.has("bio");
  const hasAvatar = formData.has("avatarUrl");
  const hasCover = formData.has("coverImageUrl");

  const nextDisplayName = displayName || user.displayName;
  const nextBio = hasBio ? (bio || null) : user.bio;
  const nextAvatarUrl = hasAvatar ? (avatarUrl || null) : user.avatarUrl;
  const nextCoverImageUrl = hasCover ? (coverImageUrl || null) : user.coverImageUrl;

  await sql`
    update users
    set
      display_name = ${nextDisplayName},
      bio = ${nextBio},
      avatar_url = ${nextAvatarUrl},
      cover_image_url = ${nextCoverImageUrl},
      updated_at = now()
    where id = ${user.id}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/profile");
  revalidatePath("/media");
  await setToast("Profile updated.");
}

export async function updateGlobalCoverAction(formData: FormData) {
  const user = await requireAdmin();
  const sql = requireDatabase();
  const coverImageUrl = String(formData.get("globalCoverImageUrl") ?? "").trim();

  await sql`
    create table if not exists app_settings (
      setting_key text primary key,
      setting_value text,
      updated_by uuid references users(id) on delete set null,
      updated_at timestamptz not null default now()
    )
  `;

  if (!coverImageUrl) {
    await sql`
      delete from app_settings
      where setting_key = 'global_profile_cover_url'
    `;
    await setToast("Global cover removed.", "info");
  } else {
    await sql`
      insert into app_settings (setting_key, setting_value, updated_by, updated_at)
      values ('global_profile_cover_url', ${coverImageUrl}, ${user.id}, now())
      on conflict (setting_key) do update
      set
        setting_value = excluded.setting_value,
        updated_by = excluded.updated_by,
        updated_at = now()
    `;
    await setToast("Global cover updated.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/profile");
}

export async function createCommunityPostAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    await setToast("Write something before posting.", "error");
    return;
  }

  await sql`
    insert into feed_posts (author_id, post_type, body)
    values (${user.id}, 'text', ${body})
  `;

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  await setToast("Post published.");
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const parentCommentId = String(formData.get("parentCommentId") ?? "").trim();

  if (!postId || !body) {
    await setToast("Comment cannot be empty.", "error");
    return;
  }

  await sql`
    insert into feed_comments (post_id, author_id, parent_comment_id, body)
    values (${postId}, ${user.id}, ${parentCommentId || null}, ${body})
  `;

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  await setToast("Comment added.");
}

export async function createCategoryAction(formData: FormData) {
  const user = await requireAdmin();
  const sql = requireDatabase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slug = slugify(name);

  if (!name || !slug) {
    await setToast("Category name is required.", "error");
    return;
  }

  await sql`
    insert into categories (slug, name, description, created_by)
    values (${slug}, ${name}, ${description || null}, ${user.id})
    on conflict (slug) do update
    set name = excluded.name, description = excluded.description, updated_at = now()
  `;

  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/media");
  await setToast("Category saved.");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const sql = requireDatabase();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slug = slugify(name);

  if (!categoryId || !name || !slug) {
    await setToast("Category name is required.", "error");
    return;
  }

  try {
    await sql`
      update categories
      set
        name = ${name},
        slug = ${slug},
        description = ${description || null},
        updated_at = now()
      where id = ${categoryId}
    `;
  } catch {
    await setToast("Could not update category. Try another name.", "error");
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/videos");
  revalidatePath("/media");
  await setToast("Category updated.");
}

export async function createMediaAction(formData: FormData): Promise<ActionOutcome> {
  const user = await requireAdmin();
  const sql = requireDatabase();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const mediaType = String(formData.get("mediaType") ?? "audio") as
    | "audio"
    | "video";
  const visibility = String(formData.get("visibility") ?? "community");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const playbackUrlInput = String(formData.get("playbackUrl") ?? "").trim();
  const mediaFile = formData.get("mediaFile");
  const posterImageUrl = String(formData.get("posterImageUrl") ?? "").trim();
  const planCode = String(formData.get("planCode") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const featuredArtists = String(formData.get("featuredArtists") ?? "").trim();
  const isFeatured = String(formData.get("isFeatured") ?? "") === "on";
  const slug = `${slugify(title)}-${Date.now()}`;

  if (!title) {
    await setToast("Title is required.", "error");
    return { ok: false, message: "Title is required.", type: "error" };
  }

  const mediaId = randomUUID();
  const uploadedPlaybackUrl = await saveUploadedMediaFile(mediaId, mediaType, mediaFile);
  const playbackUrl = playbackUrlInput || uploadedPlaybackUrl || "";

  if (!playbackUrl) {
    await setToast("Add a media file or playback URL.", "error");
    return { ok: false, message: "Add a media file or playback URL.", type: "error" };
  }

  const metadata = {
    is_featured: isFeatured,
    featured_artists: featuredArtists || null,
  };

  try {
    await sql.begin(async (tx) => {
      if (isFeatured) {
        await tx`
          update media_items
          set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{is_featured}', 'false'::jsonb, true)
          where lower(coalesce(metadata->>'is_featured', 'false')) in ('true', 't', '1', 'yes', 'on')
        `;
      }

      await tx`
        insert into media_items (
          id,
          title,
          slug,
          description,
          media_type,
          visibility,
          category_id,
          uploaded_by,
          poster_image_url,
          playback_url,
          tags,
          metadata,
          status,
          published_at
        )
        values (
          ${mediaId},
          ${title},
          ${slug},
          ${description || null},
          ${mediaType},
          ${visibility},
          ${categoryId || null},
          ${user.id},
          ${posterImageUrl || null},
          ${playbackUrl || null},
          ${JSON.stringify(tags)}::jsonb,
          ${JSON.stringify(metadata)}::jsonb,
          'published',
          now()
        )
      `;

      if (visibility === "plan_specific" && planCode) {
        const planRows = await tx<{ id: string }[]>`
          select id from membership_plans where code = ${planCode} limit 1
        `;

        if (planRows[0]) {
          await tx`
            insert into media_plan_access (media_item_id, membership_plan_id)
            values (${mediaId}, ${planRows[0].id})
            on conflict do nothing
          `;
        }
      }

      await tx`
        insert into feed_posts (author_id, post_type, body, media_item_id)
        values (
          ${user.id},
          'media_announcement',
          ${`${user.displayName} just uploaded ${title}.`},
          ${mediaId}
        )
      `;
    });
  } catch (error) {
    console.error("createMediaAction failed", error);
    await setToast("Could not publish media. Please try again.", "error");
    return {
      ok: false,
      message: "Could not publish media. Please try again.",
      type: "error",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/videos");
  revalidatePath("/media");
  revalidatePath("/dashboard");
  await setToast("Media published.");
  return { ok: true, message: "Media published.", type: "success" };
}

export async function updateMediaAction(formData: FormData): Promise<ActionOutcome> {
  await requireAdmin();
  const sql = requireDatabase();
  const mediaId = String(formData.get("mediaId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const mediaType = String(formData.get("mediaType") ?? "audio") as
    | "audio"
    | "video";
  const visibility = String(formData.get("visibility") ?? "community");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const playbackUrlInput = String(formData.get("playbackUrl") ?? "").trim();
  const mediaFile = formData.get("mediaFile");
  const posterImageUrl = String(formData.get("posterImageUrl") ?? "").trim();
  const planCode = String(formData.get("planCode") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const featuredArtists = String(formData.get("featuredArtists") ?? "").trim();
  const isFeatured = String(formData.get("isFeatured") ?? "") === "on";

  if (!mediaId || !title) {
    await setToast("Media title is required.", "error");
    return { ok: false, message: "Media title is required.", type: "error" };
  }

  const uploadedPlaybackUrl = await saveUploadedMediaFile(mediaId, mediaType, mediaFile);

  try {
    await sql.begin(async (tx) => {
      const existingRows = await tx<{
        playback_url: string | null;
        poster_image_url: string | null;
      }[]>`
        select playback_url, poster_image_url
        from media_items
        where id = ${mediaId}
        limit 1
      `;

      const existing = existingRows[0];

      if (!existing) {
        throw new Error("Media not found");
      }

      const nextPlaybackUrl =
        playbackUrlInput || uploadedPlaybackUrl || existing.playback_url;

      if (!nextPlaybackUrl) {
        throw new Error("missing_playback");
      }

      const nextPosterImageUrl = posterImageUrl || existing.poster_image_url;
      const metadata = {
        is_featured: isFeatured,
        featured_artists: featuredArtists || null,
      };

      if (isFeatured) {
        await tx`
          update media_items
          set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{is_featured}', 'false'::jsonb, true)
          where lower(coalesce(metadata->>'is_featured', 'false')) in ('true', 't', '1', 'yes', 'on')
        `;
      }

      await tx`
        update media_items
        set
          title = ${title},
          description = ${description || null},
          media_type = ${mediaType},
          visibility = ${visibility},
          category_id = ${categoryId || null},
          playback_url = ${nextPlaybackUrl},
          poster_image_url = ${nextPosterImageUrl || null},
          tags = ${JSON.stringify(tags)}::jsonb,
          metadata = ${JSON.stringify(metadata)}::jsonb,
          updated_at = now()
        where id = ${mediaId}
      `;

      await tx`
        delete from media_plan_access
        where media_item_id = ${mediaId}
      `;

      if (visibility === "plan_specific" && planCode) {
        const planRows = await tx<{ id: string }[]>`
          select id from membership_plans where code = ${planCode} limit 1
        `;

        if (planRows[0]) {
          await tx`
            insert into media_plan_access (media_item_id, membership_plan_id)
            values (${mediaId}, ${planRows[0].id})
            on conflict do nothing
          `;
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "missing_playback") {
      await setToast("Add a media file or playback URL.", "error");
      return {
        ok: false,
        message: "Add a media file or playback URL.",
        type: "error",
      };
    }

    console.error("updateMediaAction failed", error);
    await setToast("Could not update media. Please try again.", "error");
    return {
      ok: false,
      message: "Could not update media. Please try again.",
      type: "error",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/videos");
  revalidatePath("/media");
  revalidatePath("/dashboard");
  await setToast("Media updated.");
  return { ok: true, message: "Media updated.", type: "success" };
}

export async function setFeaturedMediaAction(formData: FormData): Promise<ActionOutcome> {
  await requireAdmin();
  const sql = requireDatabase();
  const mediaId = String(formData.get("mediaId") ?? "").trim();

  if (!mediaId) {
    await setToast("Select a media item first.", "error");
    return {
      ok: false,
      message: "Select a media item first.",
      type: "error",
    };
  }

  try {
    await sql.begin(async (tx) => {
      await tx`
        update media_items
        set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{is_featured}', 'false'::jsonb, true)
        where lower(coalesce(metadata->>'is_featured', 'false')) in ('true', 't', '1', 'yes', 'on')
      `;

      await tx`
        update media_items
        set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{is_featured}', 'true'::jsonb, true)
        where id = ${mediaId}
      `;
    });
  } catch (error) {
    console.error("setFeaturedMediaAction failed", error);
    await setToast("Could not set featured media. Please try again.", "error");
    return {
      ok: false,
      message: "Could not set featured media. Please try again.",
      type: "error",
    };
  }

  revalidatePath("/admin/videos");
  revalidatePath("/media");
  await setToast("Featured media updated.");
  return { ok: true, message: "Featured media updated.", type: "success" };
}

export async function grantMembershipAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const planCode = String(formData.get("planCode") ?? "monthly");

  const planRows = await sql<{ id: string; duration_days: number }[]>`
    select id, duration_days
    from membership_plans
    where code = ${planCode}
    limit 1
  `;

  const plan = planRows[0];

  if (!plan) {
    await setToast("Membership plan not found.", "error");
    return;
  }

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + plan.duration_days);

  await sql`
    insert into user_subscriptions (
      user_id,
      membership_plan_id,
      status,
      starts_at,
      ends_at,
      auto_renews,
      external_source
    )
    values (
      ${user.id},
      ${plan.id},
      'active',
      ${startsAt.toISOString()},
      ${endsAt.toISOString()},
      false,
      'manual'
    )
  `;

  revalidatePath("/dashboard");
  revalidatePath("/media");
  await setToast("Membership granted.");
}
