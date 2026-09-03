"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

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
import {
  clearLoginThrottle,
  ensureLoginDeviceId,
  getLoginThrottleMessage,
  getLoginThrottleStatus,
  recordLoginFailure,
} from "@/lib/login-throttle";
import { resolveLocalUploadPath } from "@/lib/media-stream";
import {
  authenticateAgainstWordPress,
  getCheckoutRedirectUrl,
  getWordPressPlanPrices,
  resolveWordPressGiftRecipient,
  upsertWordPressMusicProduct,
  syncMembershipStatusFromWordPress,
} from "@/lib/wordpress";
import { sendTransactionalEmail } from "@/lib/mail";

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

function redirectToLogin(message: string, extras: Record<string, string | number> = {}) {
  const params = new URLSearchParams({
    error: message,
    ...Object.fromEntries(
      Object.entries(extras).map(([key, value]) => [key, String(value)])
    ),
  });

  redirect(`/login?${params.toString()}`);
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

function isTransientInternalMediaUrl(value: string) {
  return value.startsWith("/api/media/stream?");
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

function extensionFromImage(file: File) {
  const filename = file.name || "";
  const extFromName = sanitizeExtension(filename.split(".").pop() ?? "");

  if (extFromName) {
    return extFromName;
  }

  const mime = file.type.toLowerCase();

  if (mime.startsWith("image/")) {
    return sanitizeExtension(mime.replace("image/", "")) || "jpg";
  }

  return "jpg";
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
  const filename = `${mediaId}-${Date.now()}.${extension}`;
  const destination = path.join(uploadsDir, filename);
  const inputStream = Readable.fromWeb(
    file.stream() as unknown as NodeReadableStream<Uint8Array>
  );
  const outputStream = createWriteStream(destination);
  await pipeline(inputStream, outputStream);

  return `/uploads/media/${filename}`;
}

function resolveAppAbsoluteUrl(relativePath: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000";

  return new URL(relativePath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function saveUploadedPosterFile(
  mediaId: string,
  file: FormDataEntryValue | null
) {
  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  const maxBytes = 20 * 1024 * 1024; // 20 MB poster cap
  if (file.size > maxBytes) {
    return null;
  }

  if (file.type && !file.type.startsWith("image/")) {
    return null;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "posters");
  await mkdir(uploadsDir, { recursive: true });

  const extension = extensionFromImage(file);
  const filename = `${mediaId}-${Date.now()}.${extension}`;
  const destination = path.join(uploadsDir, filename);
  const inputStream = Readable.fromWeb(
    file.stream() as unknown as NodeReadableStream<Uint8Array>
  );
  const outputStream = createWriteStream(destination);
  await pipeline(inputStream, outputStream);

  return `/uploads/posters/${filename}`;
}

async function saveUploadedProfileImage(
  ownerId: string,
  kind: "avatar" | "cover",
  file: FormDataEntryValue | null
) {
  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes || (file.type && !file.type.startsWith("image/"))) {
    return null;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(uploadsDir, { recursive: true });

  const extension = extensionFromImage(file);
  const filename = `${ownerId}-${kind}-${Date.now()}.${extension}`;
  const destination = path.join(uploadsDir, filename);
  const inputStream = Readable.fromWeb(
    file.stream() as unknown as NodeReadableStream<Uint8Array>
  );
  const outputStream = createWriteStream(destination);
  await pipeline(inputStream, outputStream);

  return `/uploads/profiles/${filename}`;
}

export async function registerAction(formData: FormData) {
  const sql = requireDatabase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawUsername = String(formData.get("username") ?? "").trim();
  const resolvedDisplayName = rawUsername || displayName || email.split("@")[0];
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
      values (${userId}, ${email}, ${username || null}, ${hashPassword(password)}, 'active', ${resolvedDisplayName})
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
  const cookieStore = await cookies();
  const existingDeviceId = cookieStore.get("worldnew_device_id")?.value;
  const deviceId = ensureLoginDeviceId(existingDeviceId);
  const secureCookie = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "").startsWith("https://");

  if (!existingDeviceId) {
    cookieStore.set("worldnew_device_id", deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  try {
    const throttleStatus = await getLoginThrottleStatus(sql, { email, deviceId });

    if (throttleStatus?.blocked) {
      await setToast(throttleStatus.message, "error");
      redirectToLogin(throttleStatus.message, {
        attemptsLeft: throttleStatus.attemptsLeft,
        retryAfterMinutes: throttleStatus.retryAfterMinutes ?? 0,
      });
    }
  } catch (error) {
    console.warn("Unable to read login throttle state", error);
  }

  // ── Local database authentication ───────────────────────────────────────
  let rows: {
    id: string;
    password_hash: string | null;
    roles: string[] | null;
    display_name: string | null;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    cover_image_url: string | null;
    active_plan_code: string | null;
    wordpress_user_id: number | null;
    wordpress_customer_id: number | null;
  }[] = [];

  try {
    rows = await sql<{
      id: string;
      password_hash: string | null;
      roles: string[] | null;
      display_name: string | null;
      username: string | null;
      bio: string | null;
      avatar_url: string | null;
      cover_image_url: string | null;
      active_plan_code: string | null;
      wordpress_user_id: number | null;
      wordpress_customer_id: number | null;
    }[]>`
      select
        u.id,
        u.password_hash,
        u.display_name,
        u.username,
        u.bio,
        u.avatar_url,
        u.cover_image_url,
        u.wordpress_user_id,
        u.wordpress_customer_id,
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
  } catch (error) {
    console.error("loginAction database query failed", error);
    await setToast("Unable to sign in right now. Please try again shortly.", "error");
    redirectToLogin("Unable to reach authentication service.");
  }

  const user = rows[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    const wpAuth = await authenticateAgainstWordPress(email, password, "/dashboard");

    if (wpAuth.status === "success") {
      try {
        await clearLoginThrottle(sql, { email, deviceId });
      } catch (error) {
        console.warn("Unable to clear login throttle state after WordPress auth", error);
      }
      redirect(wpAuth.redirectUrl);
    }

    if (wpAuth.status === "unavailable") {
      await setToast(
        "Sign-in service is temporarily unavailable. Please try again shortly.",
        "error"
      );
      redirectToLogin("Sign-in service is temporarily unavailable.");
    }

    let throttleStatus = null;

    try {
      throttleStatus = await recordLoginFailure(sql, { email, deviceId });
    } catch (error) {
      console.warn("Unable to update login throttle state", error);
    }

    const throttleMessage = "Incorrect username or password.";

    await setToast(
      throttleStatus
        ? getLoginThrottleMessage(throttleStatus)
        : throttleMessage,
      "error"
    );
    redirectToLogin(throttleMessage, {
      attemptsLeft: throttleStatus?.attemptsLeft ?? 0,
      retryAfterMinutes: throttleStatus?.retryAfterMinutes ?? 0,
    });
  }

  let refreshedPlanCode: string | null | undefined = undefined;

  try {
    await clearLoginThrottle(sql, { email, deviceId });
  } catch (error) {
    console.warn("Unable to clear login throttle state after successful auth", error);
  }

  try {
    refreshedPlanCode = await syncMembershipStatusFromWordPress({
      userId: user.id,
      email,
      wordpressUserId: user.wordpress_user_id,
      wordpressCustomerId: user.wordpress_customer_id,
    });
  } catch (error) {
    console.warn("WordPress membership refresh during local login failed", error);
  }

  try {
    await createSession(user.id);
  } catch (error) {
    console.error("createSession failed during login", error);
    await setToast("Unable to create your session right now.", "error");
    redirectToLogin("Unable to establish a session.");
  }
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
      activePlanCode:
        refreshedPlanCode === undefined ? user.active_plan_code : refreshedPlanCode,
    })
  );
}

export async function requestPasswordResetAction(formData: FormData) {
  const sql = requireDatabase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Always return a generic success message to avoid email enumeration.
  const genericResponseMessage =
    "If an account exists for that email, a password reset link has been sent.";

  if (!email || !email.includes("@")) {
    await setToast(genericResponseMessage, "info");
    redirect("/forgot-password?sent=1");
  }

  try {
    const rows = await sql<{ id: string; email: string }[]>`
      select id, email
      from users
      where lower(email) = ${email}
      limit 1
    `;
    const user = rows[0];

    if (user) {
      await sql`
        delete from password_reset_tokens
        where user_id = ${user.id}
          and used_at is null
      `;

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await sql`
        insert into password_reset_tokens (user_id, token_hash, expires_at)
        values (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
      `;

      const resetUrl = new URL("/reset-password", getAppBaseUrl());
      resetUrl.searchParams.set("token", rawToken);

      const text = [
        "You requested a password reset for your World New account.",
        "",
        `Reset your password using this link: ${resetUrl.toString()}`,
        "",
        "This link expires in 1 hour.",
        "If you did not request this, you can safely ignore this email.",
      ].join("\n");

      const html = `
        <p>You requested a password reset for your World New account.</p>
        <p><a href="${resetUrl.toString()}">Reset your password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `;

      const mailResult = await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your World New password",
        text,
        html,
      });

      if (!mailResult.sent && process.env.NODE_ENV !== "production") {
        console.warn("Password reset email not sent; SMTP not configured. Reset URL:", resetUrl.toString());
      }
    }
  } catch (error) {
    console.error("requestPasswordResetAction failed", error);
  }

  await setToast(genericResponseMessage, "info");
  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const sql = requireDatabase();
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    await setToast("Reset token is missing or invalid.", "error");
    redirect("/forgot-password");
  }

  if (newPassword.length < 8) {
    await setToast("New password must be at least 8 characters.", "error");
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=Password must be at least 8 characters.`);
  }

  if (newPassword !== confirmPassword) {
    await setToast("Passwords do not match.", "error");
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=Passwords do not match.`);
  }

  const tokenHash = hashResetToken(token);

  try {
    const rows = await sql<{ id: string; user_id: string }[]>`
      select id, user_id
      from password_reset_tokens
      where token_hash = ${tokenHash}
        and used_at is null
        and expires_at > now()
      limit 1
    `;
    const resetRow = rows[0];

    if (!resetRow) {
      await setToast("This reset link is invalid or has expired.", "error");
      redirect("/forgot-password");
    }

    await sql.begin(async (tx) => {
      await tx`
        update users
        set
          password_hash = ${hashPassword(newPassword)},
          status = 'active',
          updated_at = now()
        where id = ${resetRow.user_id}
      `;

      await tx`
        update password_reset_tokens
        set used_at = now()
        where id = ${resetRow.id}
      `;

      await tx`
        delete from app_sessions
        where user_id = ${resetRow.user_id}
      `;
    });
  } catch (error) {
    console.error("resetPasswordAction failed", error);
    await setToast("Unable to reset password right now. Please try again.", "error");
    redirect("/forgot-password");
  }

  await setToast("Password reset successful. You can now sign in.", "success");
  redirect("/login");
}

export async function updatePasswordAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    await setToast("New password must be at least 8 characters.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    await setToast("New password and confirmation do not match.", "error");
    return;
  }

  if (currentPassword && currentPassword === newPassword) {
    await setToast("Choose a different new password.", "error");
    return;
  }

  try {
    const rows = await sql<{ password_hash: string | null }[]>`
      select password_hash
      from users
      where id = ${user.id}
      limit 1
    `;
    const existingHash = rows[0]?.password_hash ?? null;

    if (existingHash && !verifyPassword(currentPassword, existingHash)) {
      await setToast("Current password is incorrect.", "error");
      return;
    }

    await sql.begin(async (tx) => {
      await tx`
        update users
        set
          password_hash = ${hashPassword(newPassword)},
          updated_at = now()
        where id = ${user.id}
      `;

      await tx`
        delete from app_sessions
        where user_id = ${user.id}
      `;
    });

    await createSession(user.id);
  } catch (error) {
    console.error("updatePasswordAction failed", error);
    await setToast("Unable to update password right now.", "error");
    return;
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/admin/profile");
  await setToast("Password updated successfully.");
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
  const hasBio = formData.has("bio");
  const avatarUpload = await saveUploadedProfileImage(user.id, "avatar", formData.get("avatarFile"));
  const coverUpload = await saveUploadedProfileImage(user.id, "cover", formData.get("coverImageFile"));
  const clearAvatar = String(formData.get("clearAvatar") ?? "") === "on";
  const clearCover = String(formData.get("clearCover") ?? "") === "on";

  const nextDisplayName = displayName || user.displayName;
  const nextBio = hasBio ? (bio || null) : user.bio;
  const nextAvatarUrl = avatarUpload ?? (clearAvatar ? null : user.avatarUrl);
  const nextCoverImageUrl = coverUpload ?? (clearCover ? null : user.coverImageUrl);

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
  const uploadedCoverUrl = await saveUploadedProfileImage(user.id, "cover", formData.get("globalCoverImageFile"));
  const coverImageUrl = uploadedCoverUrl ?? String(formData.get("globalCoverImageUrl") ?? "").trim();

  try {
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
  } catch (error) {
    console.error("updateGlobalCoverAction failed", error);
    await setToast(
      "Unable to update global cover settings. Please run the latest database migration.",
      "error"
    );
    return;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/profile");
}

function parseMembershipFeatures(featuresInput: string) {
  return featuresInput
    .split(/\r?\n|,/g)
    .map((feature) => feature.trim())
    .filter(Boolean);
}

function sanitizeMembershipPlanCode(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function ensureCommunityGroupSchema(sql: ReturnType<typeof requireDatabase>) {
  await sql`
    alter table groups
    add column if not exists sort_order integer not null default 0
  `;
}

function parseOptionalPositiveInt(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function parsePreviewSeconds(value: FormDataEntryValue | null, fallback = 30) {
  const parsed = Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.max(5, Math.round(parsed));
}

function parseOptionalPositiveNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.LOGOUT_REDIRECT_URL,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const url = new URL(candidate);
      url.pathname = "/";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      // ignore malformed values and continue
    }
  }

  return "http://localhost:3000/";
}

export async function createMembershipPlanAction(formData: FormData) {
  await requireAdmin();
  const sql = requireDatabase();
  const name = String(formData.get("name") ?? "").trim();
  const code = sanitizeMembershipPlanCode(String(formData.get("code") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const durationInput = String(formData.get("durationDays") ?? "").trim();
  const sortOrderInput = String(formData.get("sortOrder") ?? "").trim();
  const productIdInput = String(formData.get("wordpressProductId") ?? "").trim();
  const variationIdInput = String(formData.get("wordpressVariationId") ?? "").trim();
  const featuresInput = String(formData.get("features") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "") === "on";

  if (!name) {
    await setToast("Plan name is required.", "error");
    return;
  }

  if (!code || !/^[a-z][a-z0-9_]{1,39}$/.test(code)) {
    await setToast(
      "Plan code must start with a letter and use only lowercase letters, numbers, or underscores.",
      "error"
    );
    return;
  }

  const parsedDuration = Number(durationInput);
  if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
    await setToast("Duration must be at least 1 day.", "error");
    return;
  }

  const parsedSortOrder = sortOrderInput ? Number(sortOrderInput) : 0;
  if (!Number.isInteger(parsedSortOrder)) {
    await setToast("Sort order must be a whole number.", "error");
    return;
  }

  const parsedProductId = parseOptionalPositiveInt(productIdInput);
  const parsedVariationId = parseOptionalPositiveInt(variationIdInput);

  if (!parsedProductId) {
    await setToast(
      "Woo product ID is required so WordPress pricing stays in sync.",
      "error"
    );
    return;
  }

  const features = parseMembershipFeatures(featuresInput);
  if (features.length === 0) {
    await setToast("Add at least one membership feature.", "error");
    return;
  }

  try {
    const existing = await sql<{ id: string }[]>`
      select id from membership_plans where code::text = ${code} limit 1
    `;

    if (existing[0]) {
      await setToast("A membership plan with that code already exists.", "error");
      return;
    }

    const wordpressPrices = await getWordPressPlanPrices([
      {
        planCode: code,
        productId: parsedProductId,
        variationId: parsedVariationId,
      },
    ]);
    const wordpressPrice = wordpressPrices.get(code);

    if (!wordpressPrice?.price_amount) {
      throw new Error("Could not read the WooCommerce price for that membership product.");
    }

    // membership_plans.code is currently an enum type, so new values must be registered first.
    await sql.unsafe(
      `alter type membership_plan_code add value if not exists '${code}'`
    );

    await sql`
      insert into membership_plans (
        code,
        name,
        description,
        price_amount,
        currency_code,
        duration_days,
        is_active,
        sort_order,
        wordpress_product_id,
        wordpress_variation_id,
        feature_list
      )
      values (
        ${code}::membership_plan_code,
        ${name},
        ${description || null},
        ${wordpressPrice.price_amount},
        ${wordpressPrice.currency || "GBP"},
        ${parsedDuration},
        ${isActive},
        ${parsedSortOrder},
        ${parsedProductId},
        ${parsedVariationId},
        ${JSON.stringify(features)}::jsonb
      )
    `;
  } catch (error) {
    console.error("createMembershipPlanAction failed", error);
    await setToast(
      error instanceof Error ? error.message : "Could not create membership plan.",
      "error"
    );
    return;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/memberships");
  revalidatePath("/dashboard");
  revalidatePath("/media");
  await setToast("Membership plan created.");
}

export async function updateMembershipPlanAction(formData: FormData) {
  await requireAdmin();
  const sql = requireDatabase();
  const planId = String(formData.get("planId") ?? "").trim();
  const durationInput = String(formData.get("durationDays") ?? "").trim();
  const sortOrderInput = String(formData.get("sortOrder") ?? "").trim();
  const productIdInput = String(formData.get("wordpressProductId") ?? "").trim();
  const variationIdInput = String(formData.get("wordpressVariationId") ?? "").trim();
  const featuresInput = String(formData.get("features") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "") === "on";

  if (!planId) {
    await setToast("Missing membership plan.", "error");
    return;
  }

  const features = parseMembershipFeatures(featuresInput);

  if (features.length === 0) {
    await setToast("Add at least one membership feature.", "error");
    return;
  }

  const parsedDuration = Number(durationInput);
  if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
    await setToast("Duration must be at least 1 day.", "error");
    return;
  }

  const parsedSortOrder = sortOrderInput ? Number(sortOrderInput) : 0;
  if (!Number.isInteger(parsedSortOrder)) {
    await setToast("Sort order must be a whole number.", "error");
    return;
  }

  const parsedProductId = parseOptionalPositiveInt(productIdInput);
  const parsedVariationId = parseOptionalPositiveInt(variationIdInput);

  if (!parsedProductId) {
    await setToast(
      "Woo product ID is required so WordPress pricing stays in sync.",
      "error"
    );
    return;
  }

  try {
    const planRows = await sql<{ code: string }[]>`
      select code::text as code
      from membership_plans
      where id = ${planId}
      limit 1
    `;
    const plan = planRows[0];

    if (!plan) {
      await setToast("Membership plan not found.", "error");
      return;
    }

    const wordpressPrices = await getWordPressPlanPrices([
      {
        planCode: plan.code,
        productId: parsedProductId,
        variationId: parsedVariationId,
      },
    ]);
    const wordpressPrice = wordpressPrices.get(plan.code);

    if (!wordpressPrice?.price_amount) {
      throw new Error("Could not read the WooCommerce price for that membership product.");
    }

    const result = await sql<{ id: string }[]>`
      update membership_plans
      set
        price_amount = ${wordpressPrice.price_amount},
        currency_code = ${wordpressPrice.currency || "GBP"},
        duration_days = ${parsedDuration},
        is_active = ${isActive},
        sort_order = ${parsedSortOrder},
        wordpress_product_id = ${parsedProductId},
        wordpress_variation_id = ${parsedVariationId},
        feature_list = ${JSON.stringify(features)}::jsonb,
        updated_at = now()
      where id = ${planId}
      returning id
    `;

    if (!result[0]) {
      await setToast("Membership plan not found.", "error");
      return;
    }
  } catch (error) {
    console.error("updateMembershipPlanAction failed", error);
    await setToast(
      error instanceof Error ? error.message : "Could not update membership plan.",
      "error"
    );
    return;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/memberships");
  revalidatePath("/dashboard");
  revalidatePath("/media");
  await setToast("Membership plan updated.");
}

export async function startGiftMembershipCheckoutAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();

  const planCode = String(formData.get("planCode") ?? "").trim();
  const rawRecipient = String(formData.get("recipientIdentifier") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/dashboard").trim() || "/dashboard";
  const normalizedRecipient = rawRecipient.toLowerCase();

  if (!planCode || !normalizedRecipient) {
    const errorMessage = "Choose a plan and enter a recipient email or username.";
    await setToast(errorMessage, "error");
    redirect(
      `/gift-membership?returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(
        errorMessage
      )}`
    );
  }

  const localRecipient = await sql<{
    email: string;
    username: string | null;
    wordpress_user_id: number | null;
    display_name: string | null;
  }[]>`
    select email, username, wordpress_user_id, display_name
    from users
    where lower(email) = ${normalizedRecipient}
       or lower(coalesce(username, '')) = ${normalizedRecipient}
    limit 1
  `;

  const recipient =
    localRecipient[0]
      ? {
          email: localRecipient[0].email.toLowerCase(),
          username: localRecipient[0].username ?? null,
          wordpress_user_id: localRecipient[0].wordpress_user_id ?? null,
          display_name: localRecipient[0].display_name ?? null,
        }
      : await resolveWordPressGiftRecipient(normalizedRecipient);

  if (!recipient?.email) {
    const errorMessage =
      "We could not find a World New account for that email or username.";
    await setToast(errorMessage, "error");
    redirect(
      `/gift-membership?returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(
        errorMessage
      )}`
    );
  }

  const redirectTo = await getCheckoutRedirectUrl(planCode, user, {
    returnTo,
    giftRecipient: recipient,
  });

  redirect(redirectTo);
}

export async function saveWordPressMusicProductAction(formData: FormData) {
  await requireAdmin();

  const productId = parseOptionalPositiveInt(String(formData.get("productId") ?? ""));
  const releaseKindInput = String(formData.get("releaseKind") ?? "track").trim();
  const releaseKind = releaseKindInput === "album" ? "album" : "track";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const genre = String(formData.get("genre") ?? "").trim();
  const duration = String(formData.get("duration") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const streamUrlInput = String(formData.get("streamUrl") ?? "").trim();
  const streamFile = formData.get("streamFile");
  const priceInput = String(formData.get("price") ?? "").trim();
  const communityPriceInput = String(formData.get("communityPrice") ?? "").trim();
  const previewSecondsInput = String(formData.get("previewSeconds") ?? "").trim();
  const previewStartSecondsInput = String(formData.get("previewStartSeconds") ?? "").trim();
  const previewEndSecondsInput = String(formData.get("previewEndSeconds") ?? "").trim();
  const status = String(formData.get("status") ?? "publish").trim().toLowerCase();
  const isFeatured = String(formData.get("isFeatured") ?? "") === "on";
  const showOnWebsite = String(formData.get("showOnWebsite") ?? "") === "on";
  const showOnCommunity = String(formData.get("showOnCommunity") ?? "") === "on";
  const albumPackageModeInput = String(formData.get("albumPackageMode") ?? "").trim();
  const albumPackageMode = albumPackageModeInput === "existing_tracks" ? "existing_tracks" : "zip_package";
  const albumPackageZipUrl = String(formData.get("albumPackageZipUrl") ?? "").trim();
  const albumCommunityPriceRaw = String(formData.get("albumCommunityPrice") ?? "").trim();
  const albumCommunityPriceInput = albumCommunityPriceRaw || communityPriceInput;
  const albumMinimumOfferPriceInput = String(formData.get("albumMinimumOfferPrice") ?? "").trim();
  const albumEnableOfferPrice = String(formData.get("albumEnableOfferPrice") ?? "") === "on";
  const albumEnableDonation = String(formData.get("albumEnableDonation") ?? "") === "on";
  const albumAllowIndividualTrackSales = String(formData.get("albumAllowIndividualTrackSales") ?? "") === "on";
  const albumTrackSelectionSubmitted = String(formData.get("albumTrackSelectionEnabled") ?? "") === "yes";
  const albumTrackProductIds = albumTrackSelectionSubmitted
    ? Array.from(new Set(
        formData
          .getAll("albumTrackProductIds")
          .map((value) => parseOptionalPositiveInt(String(value)))
          .filter((value): value is number => value !== null)
      )).sort((left, right) => {
        const leftPosition = parseOptionalPositiveInt(String(formData.get(`albumTrackPosition_${left}`) ?? "")) ?? Number.MAX_SAFE_INTEGER;
        const rightPosition = parseOptionalPositiveInt(String(formData.get(`albumTrackPosition_${right}`) ?? "")) ?? Number.MAX_SAFE_INTEGER;
        return leftPosition - rightPosition || left - right;
      })
    : null;
  const communityPlaybackModeInput = String(
    formData.get("communityPlaybackMode") ?? "preview"
  ).trim();
  const communityPlaybackMode = ["preview", "full", "members_full"].includes(
    communityPlaybackModeInput
  )
    ? (communityPlaybackModeInput as "preview" | "full" | "members_full")
    : "preview";

  const uploadedStreamPath = await saveUploadedMediaFile(
    `wp-track-${productId ?? randomUUID()}`,
    "audio",
    streamFile
  );
  const streamUrl = streamUrlInput || (uploadedStreamPath ? resolveAppAbsoluteUrl(uploadedStreamPath) : "");

  if (!title) {
    await setToast("Track title is required.", "error");
    return;
  }

  const parsedPrice = parseOptionalPositiveNumber(priceInput);
  if (priceInput && parsedPrice === null) {
    await setToast("Please enter a valid non-negative price.", "error");
    return;
  }
  const parsedCommunityPrice = parseOptionalPositiveNumber(communityPriceInput);
  if (communityPriceInput && parsedCommunityPrice === null) {
    await setToast("Please enter a valid non-negative community price.", "error");
    return;
  }
  const parsedAlbumCommunityPrice = parseOptionalPositiveNumber(albumCommunityPriceInput);
  if (albumCommunityPriceInput && parsedAlbumCommunityPrice === null) {
    await setToast("Please enter a valid non-negative community album price.", "error");
    return;
  }
  const parsedAlbumMinimumOfferPrice = parseOptionalPositiveNumber(albumMinimumOfferPriceInput);
  if (albumMinimumOfferPriceInput && parsedAlbumMinimumOfferPrice === null) {
    await setToast("Please enter a valid non-negative minimum offer price.", "error");
    return;
  }

  const previewSeconds = previewSecondsInput ? Number(previewSecondsInput) : 30;
  if (!Number.isInteger(previewSeconds) || previewSeconds < 5) {
    await setToast("Preview seconds must be a whole number of at least 5.", "error");
    return;
  }
  const previewStartSeconds = previewStartSecondsInput ? Number(previewStartSecondsInput) : 0;
  const previewEndSeconds = previewEndSecondsInput ? Number(previewEndSecondsInput) : 0;
  if (!Number.isInteger(previewStartSeconds) || previewStartSeconds < 0) {
    await setToast("Preview start must be a whole number of 0 or more.", "error");
    return;
  }
  if (!Number.isInteger(previewEndSeconds) || previewEndSeconds < 0) {
    await setToast("Preview end must be a whole number of 0 or more.", "error");
    return;
  }
  if (previewEndSeconds > 0 && previewEndSeconds <= previewStartSeconds) {
    await setToast("Preview end must be after the preview start, or left blank.", "error");
    return;
  }

  try {
    await upsertWordPressMusicProduct({
      productId,
      kind: releaseKind,
      title,
      description,
      artist,
      genre,
      duration,
      coverImageUrl,
      streamUrl,
      price: parsedPrice !== null ? parsedPrice.toFixed(2) : "",
      communityPrice: parsedCommunityPrice !== null ? parsedCommunityPrice.toFixed(2) : "",
      previewSeconds,
      previewStartSeconds,
      previewEndSeconds,
      showOnWebsite,
      showOnCommunity,
      communityPlaybackMode,
      albumShowOnCommunity: releaseKind === "album" ? showOnCommunity : false,
      albumPackageMode: releaseKind === "album" ? albumPackageMode : null,
      albumPackageZipUrl,
      albumCommunityPrice:
        parsedAlbumCommunityPrice !== null
          ? parsedAlbumCommunityPrice.toFixed(2)
          : parsedCommunityPrice !== null
            ? parsedCommunityPrice.toFixed(2)
            : "",
      albumEnableOfferPrice,
      albumMinimumOfferPrice: parsedAlbumMinimumOfferPrice !== null ? parsedAlbumMinimumOfferPrice.toFixed(2) : "",
      albumEnableDonation,
      albumAllowIndividualTrackSales,
      albumTrackProductIds,
      isFeatured,
      status,
    });
  } catch (error) {
    console.error("saveWordPressMusicProductAction failed", error);
    await setToast(
      error instanceof Error ? error.message : "Could not save the WordPress music product.",
      "error"
    );
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/music");
  revalidatePath("/media");
  revalidatePath("/media/audio");
  await setToast(productId ? "Music product updated." : "Music product created.");
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

export async function createCommunityGroupAction(formData: FormData) {
  const user = await requireAdmin();
  const sql = requireDatabase();
  await ensureCommunityGroupSchema(sql);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrderInput = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortOrderInput ? Number(sortOrderInput) : 0;
  const visibilityInput = String(formData.get("visibility") ?? "public").trim().toLowerCase();
  const visibility = ["public", "private", "secret"].includes(visibilityInput)
    ? visibilityInput
    : "public";
  const slug = slugify(name);

  if (!name || !slug) {
    await setToast("Group name is required.", "error");
    return;
  }

  if (!Number.isInteger(sortOrder)) {
    await setToast("Group sort order must be a whole number.", "error");
    return;
  }

  try {
    const rows = await sql<{ id: string }[]>`
      insert into groups (slug, name, description, sort_order, visibility, owner_id)
      values (${slug}, ${name}, ${description || null}, ${sortOrder}, ${visibility}::group_visibility, ${user.id})
      on conflict (slug) do update
      set
        name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order,
        visibility = excluded.visibility,
        updated_at = now()
      returning id
    `;

    const groupId = rows[0]?.id;
    if (groupId) {
      await sql`
        insert into group_members (group_id, user_id, role)
        values (${groupId}, ${user.id}, 'owner')
        on conflict (group_id, user_id) do update set role = 'owner'
      `;
    }
  } catch (error) {
    console.error("createCommunityGroupAction failed", error);
    await setToast("Could not save community group.", "error");
    return;
  }

  revalidatePath("/community");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  await setToast("Community group saved.");
}

export async function updateCommunityGroupAction(formData: FormData) {
  const user = await requireAdmin();
  const sql = requireDatabase();
  await ensureCommunityGroupSchema(sql);
  const groupId = String(formData.get("groupId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrderInput = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortOrderInput ? Number(sortOrderInput) : 0;
  const visibilityInput = String(formData.get("visibility") ?? "public").trim().toLowerCase();
  const visibility = ["public", "private", "secret"].includes(visibilityInput)
    ? visibilityInput
    : "public";
  const slug = slugify(name);

  if (!groupId || !name || !slug || !Number.isInteger(sortOrder)) {
    await setToast("Group name and display order are required.", "error");
    return;
  }

  try {
    await sql`
      update groups
      set
        slug = ${slug},
        name = ${name},
        description = ${description || null},
        sort_order = ${sortOrder},
        visibility = ${visibility}::group_visibility,
        owner_id = coalesce(owner_id, ${user.id}),
        updated_at = now()
      where id = ${groupId}
    `;
  } catch (error) {
    console.error("updateCommunityGroupAction failed", error);
    await setToast("Could not update community group.", "error");
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/community");
  revalidatePath("/dashboard");
  await setToast("Community group updated.");
}

export async function createCommunityTopicAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const groupId = String(formData.get("groupId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrderInput = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortOrderInput ? Number(sortOrderInput) : 0;
  const slug = slugify(title);

  if (!groupId || !title || !slug) {
    await setToast("Topic title is required.", "error");
    return;
  }

  if (!Number.isInteger(sortOrder)) {
    await setToast("Sort order must be a whole number.", "error");
    return;
  }

  try {
    const existing = await sql<{ id: string }[]>`
      select id
      from community_topics
      where group_id = ${groupId}
        and slug = ${slug}
      limit 1
    `;

    if (existing[0]) {
      if (!user.roles.includes("artist_admin") && !user.roles.includes("super_admin")) {
        await setToast("A topic with that title already exists in this group.", "error");
        return;
      }

      await sql`
        update community_topics
        set
          title = ${title},
          description = ${description || null},
          sort_order = ${sortOrder},
          updated_at = now()
        where id = ${existing[0].id}
      `;
    } else {
      await sql`
        insert into community_topics (group_id, slug, title, description, sort_order, created_by)
        values (${groupId}, ${slug}, ${title}, ${description || null}, ${sortOrder}, ${user.id})
      `;
    }
  } catch (error) {
    console.error("createCommunityTopicAction failed", error);
    await setToast("Could not save topic.", "error");
    return;
  }

  revalidatePath("/community");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  await setToast("Topic saved.");
}

export async function updateCommunityGroupSortOrderAction(formData: FormData) {
  await requireAdmin();
  const sql = requireDatabase();
  await ensureCommunityGroupSchema(sql);
  const groupId = String(formData.get("groupId") ?? "").trim();
  const sortOrderInput = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = Number(sortOrderInput);

  if (!groupId || !Number.isInteger(sortOrder)) {
    await setToast("Enter a whole number for the group order.", "error");
    return;
  }

  await sql`
    update groups
    set sort_order = ${sortOrder}, updated_at = now()
    where id = ${groupId}
  `;

  revalidatePath("/admin");
  revalidatePath("/community");
  revalidatePath("/dashboard");
  await setToast("Group order updated.");
}

export async function updateCommunityTopicSortOrderAction(formData: FormData) {
  await requireAdmin();
  const sql = requireDatabase();
  const topicId = String(formData.get("topicId") ?? "").trim();
  const sortOrderInput = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = Number(sortOrderInput);

  if (!topicId || !Number.isInteger(sortOrder)) {
    await setToast("Enter a whole number for the topic order.", "error");
    return;
  }

  await sql`
    update community_topics
    set sort_order = ${sortOrder}, updated_at = now()
    where id = ${topicId}
  `;

  revalidatePath("/admin");
  revalidatePath("/community");
  revalidatePath("/dashboard");
  await setToast("Topic order updated.");
}

export async function createCommunityThreadAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const topicId = String(formData.get("topicId") ?? "").trim();
  const groupSlug = String(formData.get("groupSlug") ?? "").trim();
  const topicSlug = String(formData.get("topicSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!topicId || !title || !body) {
    await setToast("Thread title and body are required.", "error");
    return;
  }

  try {
    await sql`
      insert into community_threads (topic_id, author_id, title, body)
      values (${topicId}, ${user.id}, ${title}, ${body})
    `;
  } catch (error) {
    console.error("createCommunityThreadAction failed", error);
    await setToast("Could not create thread.", "error");
    return;
  }

  if (groupSlug && topicSlug) {
    revalidatePath(`/community/${groupSlug}/${topicSlug}`);
  }
  revalidatePath("/community");
  await setToast("Thread posted.");
}

export async function createCommunityThreadReplyAction(formData: FormData) {
  const user = await requireUser();
  const sql = requireDatabase();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const groupSlug = String(formData.get("groupSlug") ?? "").trim();
  const topicSlug = String(formData.get("topicSlug") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const parentReplyId = String(formData.get("parentReplyId") ?? "").trim();

  if (!threadId || !body) {
    await setToast("Reply cannot be empty.", "error");
    return;
  }

  try {
    await sql`
      insert into community_thread_replies (thread_id, author_id, parent_reply_id, body)
      values (${threadId}, ${user.id}, ${parentReplyId || null}, ${body})
    `;
  } catch (error) {
    console.error("createCommunityThreadReplyAction failed", error);
    await setToast("Could not save reply.", "error");
    return;
  }

  if (groupSlug && topicSlug) {
    revalidatePath(`/community/${groupSlug}/${topicSlug}`);
  }
  await setToast("Reply posted.");
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
  const mediaType = "video";
  const visibility = String(formData.get("visibility") ?? "community");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const playbackUrlInput = String(formData.get("playbackUrl") ?? "").trim();
  const mediaFile = formData.get("mediaFile");
  const posterFile = formData.get("posterFile");
  const uploadedPlaybackPath = String(formData.get("uploadedPlaybackPath") ?? "").trim();
  const uploadedPosterPath = String(formData.get("uploadedPosterPath") ?? "").trim();
  const posterImageUrl = String(formData.get("posterImageUrl") ?? "").trim();
  const planCode = String(formData.get("planCode") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const featuredArtists = String(formData.get("featuredArtists") ?? "").trim();
  const previewSeconds = parsePreviewSeconds(formData.get("previewSeconds"));
  const isFeatured = String(formData.get("isFeatured") ?? "") === "on";
  const slug = `${slugify(title)}-${Date.now()}`;

  if (!title) {
    await setToast("Title is required.", "error");
    return { ok: false, message: "Title is required.", type: "error" };
  }

  const mediaId = randomUUID();
  const uploadedPlaybackUrl =
    uploadedPlaybackPath || (await saveUploadedMediaFile(mediaId, mediaType, mediaFile)) || "";
  const uploadedPosterUrl =
    uploadedPosterPath || (await saveUploadedPosterFile(mediaId, posterFile)) || "";
  const playbackUrl = playbackUrlInput || uploadedPlaybackUrl || "";
  const nextPosterImageUrl = uploadedPosterUrl || posterImageUrl || null;

  if (!playbackUrl) {
    await setToast("Add a media file or playback URL.", "error");
    return { ok: false, message: "Add a media file or playback URL.", type: "error" };
  }

  if (isTransientInternalMediaUrl(playbackUrl)) {
    await setToast("Use the original playback URL or re-upload the media file.", "error");
    return {
      ok: false,
      message: "Use the original playback URL or re-upload the media file.",
      type: "error",
    };
  }

  try {
    await sql.begin(async (tx) => {
      if (isFeatured) {
        await tx`
          update media_items
          set metadata = jsonb_set(
            case
              when jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object' then coalesce(metadata, '{}'::jsonb)
              else '{}'::jsonb
            end,
            '{is_featured}',
            'false'::jsonb,
            true
          )
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
          ${nextPosterImageUrl},
          ${playbackUrl || null},
          ${JSON.stringify(tags)}::jsonb,
          jsonb_build_object(
            'is_featured', ${isFeatured}::boolean,
            'featured_artists', ${featuredArtists || null}::text,
            'preview_seconds', ${previewSeconds}::int
          ),
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
  const mediaType = "video";
  const visibility = String(formData.get("visibility") ?? "community");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const playbackUrlInput = String(formData.get("playbackUrl") ?? "").trim();
  const mediaFile = formData.get("mediaFile");
  const posterFile = formData.get("posterFile");
  const uploadedPlaybackPath = String(formData.get("uploadedPlaybackPath") ?? "").trim();
  const uploadedPosterPath = String(formData.get("uploadedPosterPath") ?? "").trim();
  const posterImageUrl = String(formData.get("posterImageUrl") ?? "").trim();
  const planCode = String(formData.get("planCode") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const featuredArtists = String(formData.get("featuredArtists") ?? "").trim();
  const previewSeconds = parsePreviewSeconds(formData.get("previewSeconds"));
  const isFeatured = String(formData.get("isFeatured") ?? "") === "on";

  if (!mediaId || !title) {
    await setToast("Media title is required.", "error");
    return { ok: false, message: "Media title is required.", type: "error" };
  }

  const uploadedPlaybackUrl =
    uploadedPlaybackPath || (await saveUploadedMediaFile(mediaId, mediaType, mediaFile)) || "";
  const uploadedPosterUrl =
    uploadedPosterPath || (await saveUploadedPosterFile(mediaId, posterFile)) || "";

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

      if (isTransientInternalMediaUrl(nextPlaybackUrl)) {
        throw new Error("invalid_playback_url");
      }

      const nextPosterImageUrl =
        uploadedPosterUrl || posterImageUrl || existing.poster_image_url;
      if (isFeatured) {
        await tx`
          update media_items
          set metadata = jsonb_set(
            case
              when jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object' then coalesce(metadata, '{}'::jsonb)
              else '{}'::jsonb
            end,
            '{is_featured}',
            'false'::jsonb,
            true
          )
          where id <> ${mediaId}
            and lower(coalesce(metadata->>'is_featured', 'false')) in ('true', 't', '1', 'yes', 'on')
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
          metadata = jsonb_build_object(
            'is_featured', ${isFeatured}::boolean,
            'featured_artists', ${featuredArtists || null}::text,
            'preview_seconds', ${previewSeconds}::int
          ),
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

    if (error instanceof Error && error.message === "invalid_playback_url") {
      await setToast("Use the original playback URL or re-upload the media file.", "error");
      return {
        ok: false,
        message: "Use the original playback URL or re-upload the media file.",
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
        set metadata = jsonb_set(
          case
            when jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object' then coalesce(metadata, '{}'::jsonb)
            else '{}'::jsonb
          end,
          '{is_featured}',
          'false'::jsonb,
          true
        )
        where id <> ${mediaId}
          and lower(coalesce(metadata->>'is_featured', 'false')) in ('true', 't', '1', 'yes', 'on')
      `;

      const updated = await tx<{ id: string }[]>`
        update media_items
        set metadata = jsonb_set(
          case
            when jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object' then coalesce(metadata, '{}'::jsonb)
            else '{}'::jsonb
          end,
          '{is_featured}',
          'true'::jsonb,
          true
        )
        where id = ${mediaId}
        returning id
      `;

      if (!updated[0]) {
        throw new Error("missing_media_item");
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "missing_media_item") {
      await setToast("Could not find that media item.", "error");
      return {
        ok: false,
        message: "Could not find that media item.",
        type: "error",
      };
    }

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

export async function toggleMediaShowcaseVisibilityAction(
  formData: FormData
): Promise<ActionOutcome> {
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
    const rows = await sql<{
      id: string;
      is_hidden: boolean;
    }[]>`
      update media_items
      set metadata = jsonb_set(
        case
          when jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object' then coalesce(metadata, '{}'::jsonb)
          else '{}'::jsonb
        end,
        '{hide_from_public_pages}',
        case
          when lower(coalesce(metadata->>'hide_from_public_pages', 'false')) in ('true', 't', '1', 'yes', 'on')
            then 'false'::jsonb
          else 'true'::jsonb
        end,
        true
      ),
      updated_at = now()
      where id = ${mediaId}
      returning
        id,
        case
          when lower(coalesce(metadata->>'hide_from_public_pages', 'false')) in ('true', 't', '1', 'yes', 'on')
            then true
          else false
        end as is_hidden
    `;

    const updated = rows[0];

    if (!updated) {
      throw new Error("missing_media_item");
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/videos");
    revalidatePath("/dashboard");
    revalidatePath("/media");
    revalidatePath("/media/audio");

    const message = updated.is_hidden
      ? "Media hidden from the homepage and media shelves."
      : "Media restored to the homepage and media shelves.";

    await setToast(message);
    return { ok: true, message, type: "success" };
  } catch (error) {
    if (error instanceof Error && error.message === "missing_media_item") {
      await setToast("Could not find that media item.", "error");
      return {
        ok: false,
        message: "Could not find that media item.",
        type: "error",
      };
    }

    console.error("toggleMediaShowcaseVisibilityAction failed", error);
    await setToast("Could not update media visibility. Please try again.", "error");
    return {
      ok: false,
      message: "Could not update media visibility. Please try again.",
      type: "error",
    };
  }
}

export async function deleteMediaPermanentlyAction(
  formData: FormData
): Promise<ActionOutcome> {
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

  let playbackUrl: string | null = null;
  let posterImageUrl: string | null = null;

  try {
    const deletedRows = await sql<{
      playback_url: string | null;
      poster_image_url: string | null;
    }[]>`
      delete from media_items
      where id = ${mediaId}
      returning playback_url, poster_image_url
    `;

    const deleted = deletedRows[0];

    if (!deleted) {
      throw new Error("missing_media_item");
    }

    playbackUrl = deleted.playback_url;
    posterImageUrl = deleted.poster_image_url;
  } catch (error) {
    if (error instanceof Error && error.message === "missing_media_item") {
      await setToast("Could not find that media item.", "error");
      return {
        ok: false,
        message: "Could not find that media item.",
        type: "error",
      };
    }

    console.error("deleteMediaPermanentlyAction failed", error);
    await setToast("Could not delete media. Please try again.", "error");
    return {
      ok: false,
      message: "Could not delete media. Please try again.",
      type: "error",
    };
  }

  const localPlaybackPath = resolveLocalUploadPath(playbackUrl);
  const localPosterPath = resolveLocalUploadPath(posterImageUrl);

  await Promise.all([
    localPlaybackPath ? rm(localPlaybackPath, { force: true }).catch(() => undefined) : null,
    localPosterPath ? rm(localPosterPath, { force: true }).catch(() => undefined) : null,
  ]);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/videos");
  revalidatePath("/dashboard");
  revalidatePath("/media");
  revalidatePath("/media/audio");
  await setToast("Media deleted permanently.");
  return {
    ok: true,
    message: "Media deleted permanently.",
    type: "success",
  };
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
