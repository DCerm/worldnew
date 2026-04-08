import { createHmac, timingSafeEqual } from "crypto";
import { randomUUID } from "crypto";

import { createSession, getDashboardDestination, type AuthUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

type WordPressSsoPayload = {
  email: string;
  wordpress_user_id: number;
  wordpress_customer_id?: number | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  bio?: string | null;
  roles?: string[];
  timestamp?: number;
};

type WooCommerceWebhookPayload = {
  event?: string;
  order_id?: string | number | null;
  subscription_id?: string | number | null;
  user?: {
    email?: string | null;
    wordpress_user_id?: number | null;
    wordpress_customer_id?: number | null;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  membership?: {
    plan_code?: string | null;
    status?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    auto_renews?: boolean | null;
    amount?: number | null;
    currency?: string | null;
  };
};

export function getWordPressBaseUrl() {
  return process.env.WORDPRESS_BASE_URL?.replace(/\/+$/, "") ?? "";
}

export function getWordPressAuthUrl() {
  const envUrl = process.env.WORDPRESS_LOGIN_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/my-account/` : "";
}

export function getWordPressCredentialAuthUrl() {
  const envUrl = process.env.WORDPRESS_AUTH_API_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/auth/login` : "";
}

export function getWooCommerceCheckoutUrl() {
  const envUrl = process.env.WORDPRESS_CHECKOUT_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/checkout/` : "";
}

function getSharedSecret() {
  const secret = process.env.WORDPRESS_SSO_SECRET?.trim();

  if (!secret) {
    throw new Error("WORDPRESS_SSO_SECRET is not configured.");
  }

  return secret;
}

function createSignature(payload: string) {
  return createHmac("sha256", getSharedSecret()).update(payload).digest("hex");
}

export function verifySignedPayload(rawBody: string, receivedSignature: string | null) {
  if (!receivedSignature) {
    return false;
  }

  const expected = createSignature(rawBody);
  const normalizedSignature = receivedSignature.trim();
  const expectedBase64 = Buffer.from(expected, "hex").toString("base64");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const expectedBase64Buffer = Buffer.from(expectedBase64, "utf8");
  const receivedBuffer = Buffer.from(normalizedSignature, "utf8");

  return (
    (expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)) ||
    (expectedBase64Buffer.length === receivedBuffer.length && timingSafeEqual(expectedBase64Buffer, receivedBuffer))
  );
}

function normalizeRoleCodes(roles: string[] | undefined) {
  const accepted = new Set(["member", "artist_admin", "super_admin", "moderator"]);
  return (roles ?? []).filter((role) => accepted.has(role));
}

function toDashboardUser(user: {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  roles: string[] | null;
  active_plan_code?: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name ?? user.email.split("@")[0],
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    coverImageUrl: user.cover_image_url,
    roles: user.roles ?? [],
    activePlanCode: user.active_plan_code ?? null,
  };
}

export async function syncWordPressUser(payload: WordPressSsoPayload) {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const roles = normalizeRoleCodes(payload.roles);
  const username = (payload.display_name ?? payload.email.split("@")[0])
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const wordpressUserId = payload.wordpress_user_id > 0 ? payload.wordpress_user_id : null;
  const wordpressCustomerId = payload.wordpress_customer_id && payload.wordpress_customer_id > 0
    ? payload.wordpress_customer_id
    : null;

  const rows = await sql.begin(async (tx) => {
    const userRows = await tx<{
      id: string;
      email: string;
      display_name: string | null;
      username: string | null;
      bio: string | null;
      avatar_url: string | null;
      cover_image_url: string | null;
      roles: string[] | null;
    }[]>`
      insert into users (
        id,
        email,
        username,
        status,
        wordpress_user_id,
        wordpress_customer_id,
        first_name,
        last_name,
        display_name,
        avatar_url,
        cover_image_url,
        bio,
        updated_at
      )
      values (
        ${randomUUID()},
        ${payload.email.toLowerCase()},
        ${username || null},
        'active',
        ${wordpressUserId},
        ${wordpressCustomerId},
        ${payload.first_name ?? null},
        ${payload.last_name ?? null},
        ${payload.display_name ?? null},
        ${payload.avatar_url ?? null},
        ${payload.cover_image_url ?? null},
        ${payload.bio ?? null},
        now()
      )
      on conflict (email) do update
      set
        wordpress_user_id = excluded.wordpress_user_id,
        wordpress_customer_id = coalesce(excluded.wordpress_customer_id, users.wordpress_customer_id),
        first_name = coalesce(excluded.first_name, users.first_name),
        last_name = coalesce(excluded.last_name, users.last_name),
        display_name = coalesce(excluded.display_name, users.display_name),
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
        cover_image_url = coalesce(excluded.cover_image_url, users.cover_image_url),
        bio = coalesce(excluded.bio, users.bio),
        status = 'active',
        updated_at = now()
      returning id, email, display_name, username, bio, avatar_url, cover_image_url
    `;

    const user = userRows[0];

    await tx`
      insert into user_auth_accounts (user_id, provider, provider_user_id, provider_email, metadata)
      values (
        ${user.id},
        'wordpress',
        ${String(wordpressUserId ?? wordpressCustomerId ?? payload.email.toLowerCase())},
        ${payload.email.toLowerCase()},
        ${JSON.stringify({
          wordpress_user_id: wordpressUserId,
          wordpress_customer_id: wordpressCustomerId,
        })}
      )
      on conflict (provider, provider_user_id) do update
      set
        provider_email = excluded.provider_email,
        metadata = excluded.metadata,
        updated_at = now()
    `;

    if (roles.length > 0) {
      const roleRows = await tx<{ id: string; code: string }[]>`
        select id, code::text from roles where code = any(${roles})
      `;

      for (const role of roleRows) {
        await tx`
          insert into user_roles (user_id, role_id)
          values (${user.id}, ${role.id})
          on conflict do nothing
        `;
      }
    } else {
      const memberRows = await tx<{ id: string }[]>`
        select id from roles where code = 'member' limit 1
      `;

      if (memberRows[0]) {
        await tx`
          insert into user_roles (user_id, role_id)
          values (${user.id}, ${memberRows[0].id})
          on conflict do nothing
        `;
      }
    }

    const roleResult = await tx<{ code: string }[]>`
      select r.code::text
      from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = ${user.id}
    `;

    return [
      {
        ...user,
        roles: roleResult.map((role) => role.code),
      },
    ];
  });

  return toDashboardUser(rows[0]);
}

function normalizeSubscriptionStatus(status: string | null | undefined) {
  const normalizedStatus = (status ?? "").toLowerCase();

  switch (normalizedStatus) {
    case "active":
    case "trialing":
    case "cancelled":
    case "expired":
    case "past_due":
    case "pending":
    case "refunded":
      return normalizedStatus;
    default:
      return "active";
  }
}

export async function applyWooCommerceWebhook(payload: WooCommerceWebhookPayload) {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const rawEventName = payload.event ?? "unknown";
  const serializedPayload = JSON.stringify(payload);

  await sql`
    insert into webhook_events (source, event_name, external_id, payload)
    values (
      'woocommerce',
      ${rawEventName},
      ${String(payload.subscription_id ?? payload.order_id ?? "") || null},
      ${serializedPayload}
    )
  `;

  const email = payload.user?.email?.toLowerCase().trim();
  const planCode = payload.membership?.plan_code?.trim() ?? null;

  if (!email || !planCode) {
    return { synced: false, reason: "Missing email or plan code." };
  }

  const wpUserId = payload.user?.wordpress_user_id ?? null;
  const wpCustomerId = payload.user?.wordpress_customer_id ?? null;

  const user = await syncWordPressUser({
    email,
    wordpress_user_id: wpUserId && wpUserId > 0 ? wpUserId : Number(wpCustomerId ?? 0),
    wordpress_customer_id: wpCustomerId,
    display_name: payload.user?.display_name ?? null,
    first_name: payload.user?.first_name ?? null,
    last_name: payload.user?.last_name ?? null,
    roles: ["member"],
  });

  const planRows = await sql<{ id: string }[]>`
    select id
    from membership_plans
    where code = ${planCode}
    limit 1
  `;

  const plan = planRows[0];

  if (!plan) {
    return { synced: false, reason: `Unknown plan code: ${planCode}` };
  }

  const startsAt = payload.membership?.starts_at ? new Date(payload.membership.starts_at) : new Date();
  const endsAt = payload.membership?.ends_at ? new Date(payload.membership.ends_at) : null;

  const externalSubscriptionId = payload.subscription_id ? String(payload.subscription_id) : null;
  const existingSubscription = externalSubscriptionId
    ? await sql<{ id: string }[]>`
        select id
        from user_subscriptions
        where external_source = 'woocommerce'
          and external_subscription_id = ${externalSubscriptionId}
        limit 1
      `
    : [];

  if (existingSubscription[0]) {
    await sql`
      update user_subscriptions
      set
        membership_plan_id = ${plan.id},
        status = ${normalizeSubscriptionStatus(payload.membership?.status)},
        starts_at = ${startsAt.toISOString()},
        ends_at = ${endsAt ? endsAt.toISOString() : null},
        auto_renews = ${Boolean(payload.membership?.auto_renews)},
        external_order_id = ${payload.order_id ? String(payload.order_id) : null},
        purchase_amount = ${payload.membership?.amount ?? null},
        currency_code = ${payload.membership?.currency ?? "USD"},
        metadata = ${serializedPayload},
        updated_at = now()
      where id = ${existingSubscription[0].id}
    `;
  } else {
    await sql`
      insert into user_subscriptions (
        user_id,
        membership_plan_id,
        status,
        starts_at,
        ends_at,
        auto_renews,
        external_source,
        external_order_id,
        external_subscription_id,
        purchase_amount,
        currency_code,
        metadata
      )
      values (
        ${user.id},
        ${plan.id},
        ${normalizeSubscriptionStatus(payload.membership?.status)},
        ${startsAt.toISOString()},
        ${endsAt ? endsAt.toISOString() : null},
        ${Boolean(payload.membership?.auto_renews)},
        'woocommerce',
        ${payload.order_id ? String(payload.order_id) : null},
        ${externalSubscriptionId},
        ${payload.membership?.amount ?? null},
        ${payload.membership?.currency ?? "USD"},
        ${serializedPayload}
      )
    `;
  }

  await sql`
    update webhook_events
    set processed_at = now()
    where source = 'woocommerce'
      and event_name = ${rawEventName}
      and external_id = ${String(payload.subscription_id ?? payload.order_id ?? "") || null}
      and processed_at is null
  `;

  return { synced: true, userId: user.id };
}

export async function finishWordPressLogin(payload: WordPressSsoPayload) {
  const user = await syncWordPressUser(payload);
  await createSession(user.id);

  return {
    user,
    destination: getDashboardDestination(user),
  };
}

type WordPressCredentialAuthResult =
  | {
      status: "success";
      redirectUrl: string;
    }
  | {
      status: "invalid_credentials";
    }
  | {
      status: "unavailable";
    };

export async function authenticateAgainstWordPress(email: string, password: string, returnTo?: string | null) {
  const endpoint = getWordPressCredentialAuthUrl();

  if (!endpoint) {
    return { status: "unavailable" } satisfies WordPressCredentialAuthResult;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        return_to: returnTo ?? "/dashboard",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { status: "invalid_credentials" } satisfies WordPressCredentialAuthResult;
      }

      console.error("WordPress credential auth returned non-OK status", response.status, endpoint);
      return { status: "unavailable" } satisfies WordPressCredentialAuthResult;
    }

    const data = (await response.json()) as {
      success?: boolean;
      redirect_url?: string;
    };

    if (!data.success || !data.redirect_url) {
      return { status: "unavailable" } satisfies WordPressCredentialAuthResult;
    }

    return {
      status: "success",
      redirectUrl: data.redirect_url,
    } satisfies WordPressCredentialAuthResult;
  } catch (error) {
    console.error("WordPress credential auth failed", error);
    return { status: "unavailable" } satisfies WordPressCredentialAuthResult;
  }
}

export async function getCheckoutRedirectUrl(planCode: string, user: AuthUser, returnTo?: string | null) {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const checkoutBaseUrl = getWooCommerceCheckoutUrl();

  if (!checkoutBaseUrl) {
    throw new Error("WORDPRESS_CHECKOUT_URL or WORDPRESS_BASE_URL is not configured.");
  }

  const planRows = await sql<{
    wordpress_product_id: number | null;
    wordpress_variation_id: number | null;
    code: string;
  }[]>`
    select wordpress_product_id, wordpress_variation_id, code::text
    from membership_plans
    where code = ${planCode}
    limit 1
  `;

  const plan = planRows[0];

  const envProductMap: Record<string, string | undefined> = {
    day_pass: process.env.WORDPRESS_PRODUCT_DAY_PASS,
    monthly: process.env.WORDPRESS_PRODUCT_MONTHLY,
    annual: process.env.WORDPRESS_PRODUCT_ANNUAL,
  };

  const productId = plan?.wordpress_product_id ?? (envProductMap[planCode] ? Number(envProductMap[planCode]) : null);
  const variationId = plan?.wordpress_variation_id ?? null;

  if (!productId) {
    throw new Error(`No WooCommerce product mapping found for plan "${planCode}".`);
  }

  const url = new URL(checkoutBaseUrl);
  url.searchParams.set("add-to-cart", String(productId));

  if (variationId) {
    url.searchParams.set("variation_id", String(variationId));
  }

  url.searchParams.set("app_email", user.email);
  url.searchParams.set("app_user_id", user.id);

  if (returnTo) {
    url.searchParams.set("return_to", returnTo);
  }

  return url.toString();
}
