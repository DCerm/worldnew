import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

import { getSql, withDb } from "@/lib/db";

const SESSION_COOKIE = "worldnew_session";
const SESSION_TTL_DAYS = 14;

function getBooleanEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }

  return null;
}

function shouldUseSecureSessionCookie() {
  const explicit = getBooleanEnv("SESSION_COOKIE_SECURE");
  if (explicit !== null) {
    return explicit;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  if (appUrl.startsWith("https://")) {
    return true;
  }

  return false;
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  roles: string[];
  activePlanCode: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [salt, key] = storedHash.split(":");

  if (!salt || !key) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64);
  const storedKey = Buffer.from(key, "hex");

  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export async function createSession(userId: string) {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await sql`
    insert into app_sessions (user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie(),
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    const sql = getSql();

    if (sql) {
      await sql`
        delete from app_sessions
        where token_hash = ${hashToken(sessionToken)}
      `;
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  return withDb(async (sql) => {
    const rows = await sql<{
      id: string;
      email: string;
      display_name: string | null;
      username: string | null;
      bio: string | null;
      avatar_url: string | null;
      cover_image_url: string | null;
      roles: string[] | null;
      active_plan_code: string | null;
    }[]>`
      select
        u.id,
        u.email,
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
      from app_sessions s
      join users u on u.id = s.user_id
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      where s.token_hash = ${hashToken(sessionToken)}
        and s.expires_at > now()
      group by u.id
      limit 1
    `;

    const user = rows[0];

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name ?? user.email.split("@")[0],
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      coverImageUrl: user.cover_image_url,
      roles: user.roles ?? [],
      activePlanCode: user.active_plan_code,
    };
  }, null);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!user.roles.includes("artist_admin") && !user.roles.includes("super_admin")) {
    redirect("/dashboard");
  }

  return user;
}

export function getDashboardDestination(user: AuthUser) {
  if (user.roles.includes("artist_admin") || user.roles.includes("super_admin")) {
    return "/admin";
  }

  return "/dashboard";
}
