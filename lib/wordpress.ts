import { createHmac, timingSafeEqual } from "crypto";
import { randomUUID } from "crypto";

import { createSession, getDashboardDestination, type AuthUser } from "@/lib/auth";
import { normalizeOptionalUrl, resolveAvatarUrl } from "@/lib/avatar";
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

export type WordPressMusicTrack = {
  id: number;
  title: string;
  artist: string;
  genre: string;
  duration: string;
  preview_seconds?: number | null;
  preview_start_seconds?: number | null;
  preview_end_seconds?: number | null;
  cover_image_url: string;
  stream_url: string;
  price: number | null;
  community_price?: number | null;
  display_price?: number | null;
  currency: string;
  checkout_url: string;
  community_checkout_url?: string | null;
  product_url: string;
  is_featured: boolean;
  show_on_website?: boolean;
  show_on_community?: boolean;
  album_show_on_community?: boolean;
  community_playback_mode?: "preview" | "full" | "members_full";
  can_download?: boolean;
  download_url?: string;
};

type WordPressMusicCatalogResponse = {
  success?: boolean;
  tracks?: WordPressMusicTrack[];
};

export type WordPressMusicProduct = {
  id: number;
  kind: "track" | "bundle" | "video";
  title: string;
  artist: string;
  genre: string;
  description?: string | null;
  short_description?: string | null;
  duration?: string | null;
  preview_seconds?: number | null;
  preview_start_seconds?: number | null;
  preview_end_seconds?: number | null;
  stream_url?: string | null;
  cover_image_url: string;
  price: number | null;
  community_price?: number | null;
  display_price?: number | null;
  currency: string;
  is_featured: boolean;
  show_on_website?: boolean;
  show_on_community?: boolean;
  album_show_on_community?: boolean;
  community_playback_mode?: "preview" | "full" | "members_full";
  community_category?: "movies" | "reels" | "mixtapes" | "behind-the-scenes";
  poster_image_url?: string | null;
  status: string;
  published_at?: string | null;
  product_url: string;
  community_checkout_url?: string | null;
  edit_url?: string | null;
  category_slugs?: string[];
  album_package?: {
    zip_url?: string | null;
    tracklist_pdf_url?: string | null;
    thankyou_pdf_url?: string | null;
    itunes_guide_pdf_url?: string | null;
  } | null;
  album_package_mode?: "existing_tracks" | "zip_package" | null;
  album_community_offer?: {
    price?: string | null;
    track_price?: string | null;
    enable_offer_price?: boolean;
    minimum_offer_price?: string | null;
    enable_donation?: boolean;
    allow_individual_track_sales?: boolean;
  } | null;
  album_track_product_ids?: number[];
  bundle_tracks: WordPressMusicTrack[];
};

type WordPressMusicAdminListResponse = {
  success?: boolean;
  products?: WordPressMusicProduct[];
};

type WordPressMusicAdminUpsertResponse = {
  success?: boolean;
  error?: string;
  product?: WordPressMusicProduct;
};

type WordPressPlanPriceSnapshot = {
  product_id: number;
  variation_id?: number | null;
  resolved_id: number;
  price_amount: string | null;
  regular_price: string | null;
  currency: string;
  product_name: string;
  product_status: string;
};

type WordPressPlanPricesResponse = {
  success?: boolean;
  plans?: Array<{
    plan_code?: string;
    price?: WordPressPlanPriceSnapshot | null;
  }>;
};

export type WordPressGiftRecipient = {
  email: string;
  username?: string | null;
  wordpress_user_id?: number | null;
  display_name?: string | null;
};

type WordPressGiftRecipientResponse = {
  success?: boolean;
  recipient?: WordPressGiftRecipient | null;
  error?: string;
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

export function getWordPressSubscriptionStatusUrl() {
  const envUrl = process.env.WORDPRESS_SUBSCRIPTION_STATUS_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/subscription/status` : "";
}

export function getWordPressPlanSyncApiUrl() {
  const envUrl = process.env.WORDPRESS_PLAN_SYNC_API_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/plans/sync` : "";
}

export function getWordPressPlanPricesApiUrl() {
  const envUrl = process.env.WORDPRESS_PLAN_PRICES_API_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/plans/prices` : "";
}

export function getWordPressGiftRecipientResolveUrl() {
  const envUrl = process.env.WORDPRESS_GIFT_RECIPIENT_RESOLVE_API_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/gift-recipient/resolve` : "";
}

export function getWordPressCheckoutSessionUrl() {
  const envUrl = process.env.WORDPRESS_CHECKOUT_SESSION_API_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/checkout/session` : "";
}

export function getWooCommerceCheckoutUrl() {
  const envUrl = process.env.WORDPRESS_CHECKOUT_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/checkout/` : "";
}

export function getWordPressMusicCatalogUrl() {
  const envUrl =
    process.env.WORDPRESS_MUSIC_CATALOG_API_URL?.trim() ??
    process.env.WORDPRESS_MUSIC_CATALOG_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/music/catalog` : "";
}

export function getWordPressMusicAdminListUrl() {
  const envUrl = process.env.WORDPRESS_MUSIC_ADMIN_LIST_API_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/music/admin/list` : "";
}

export function getWordPressMusicAdminUpsertUrl() {
  const envUrl = process.env.WORDPRESS_MUSIC_ADMIN_UPSERT_API_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  const baseUrl = getWordPressBaseUrl();
  return baseUrl ? `${baseUrl}/wp-json/worldnew/v1/music/admin/upsert` : "";
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

function getLocalhostFallbackEndpoint(endpoint: string) {
  if (!endpoint.includes("host.docker.internal")) {
    return null;
  }

  return endpoint.replace("host.docker.internal", "localhost");
}

async function fetchWordPressEndpointWithFallback(
  endpoint: string,
  init: RequestInit
) {
  try {
    return await fetch(endpoint, init);
  } catch (error) {
    const fallback = getLocalhostFallbackEndpoint(endpoint);

    if (!fallback) {
      throw error;
    }

    return fetch(fallback, init);
  }
}

export async function getWordPressMusicCatalog(options: {
  featuredOnly?: boolean;
  limit?: number;
  target?: "website" | "community";
} = {}) {
  const endpoint = getWordPressMusicCatalogUrl();

  if (!endpoint) {
    return [] as WordPressMusicTrack[];
  }

  const url = new URL(endpoint);
  const limit = typeof options.limit === "number" && Number.isFinite(options.limit)
    ? Math.max(1, Math.min(Math.floor(options.limit), 250))
    : 120;

  url.searchParams.set("limit", String(limit));
  url.searchParams.set("category", "track");
  url.searchParams.set("target", options.target ?? "community");
  if (options.featuredOnly) {
    url.searchParams.set("featured", "yes");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetchWordPressEndpointWithFallback(url.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return [] as WordPressMusicTrack[];
    }

    const payload = (await response.json()) as WordPressMusicCatalogResponse;
    const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];

    return tracks.filter((track) => Boolean(track?.id && track?.title));
  } catch (error) {
    console.warn("WordPress music catalog request failed", error);
    return [] as WordPressMusicTrack[];
  } finally {
    clearTimeout(timeout);
  }
}

export async function getWordPressMusicProductsForAdmin() {
  const endpoint = getWordPressMusicAdminListUrl();

  if (!endpoint) {
    return [] as WordPressMusicProduct[];
  }

  try {
    const payload = await postSignedWordPressJson<WordPressMusicAdminListResponse>(endpoint, {});
    const products = Array.isArray(payload.products) ? payload.products : [];

    return products.filter((product) => Boolean(product?.id && product?.title));
  } catch (error) {
    console.warn("WordPress music admin list request failed", error);
    return [] as WordPressMusicProduct[];
  }
}

export async function getWordPressPlanPrices(
  plans: Array<{
    planCode: string;
    productId: number | null;
    variationId?: number | null;
  }>
) {
  const endpoint = getWordPressPlanPricesApiUrl();

  if (!endpoint || plans.length === 0) {
    return new Map<string, WordPressPlanPriceSnapshot>();
  }

  const eligiblePlans = plans.filter((plan) => plan.productId && plan.productId > 0);

  if (eligiblePlans.length === 0) {
    return new Map<string, WordPressPlanPriceSnapshot>();
  }

  try {
    const payload = await postSignedWordPressJson<WordPressPlanPricesResponse>(endpoint, {
      plans: eligiblePlans.map((plan) => ({
        plan_code: plan.planCode,
        product_id: plan.productId,
        variation_id: plan.variationId && plan.variationId > 0 ? plan.variationId : null,
      })),
    });

    const result = new Map<string, WordPressPlanPriceSnapshot>();

    for (const entry of payload.plans ?? []) {
      if (entry?.plan_code && entry.price?.price_amount) {
        result.set(entry.plan_code, entry.price);
      }
    }

    return result;
  } catch (error) {
    console.warn("WordPress plan price request failed", error);
    return new Map<string, WordPressPlanPriceSnapshot>();
  }
}

export async function upsertWordPressMusicProduct(input: {
  productId?: number | null;
  kind?: "track" | "bundle" | "album";
  title: string;
  description?: string | null;
  artist?: string | null;
  genre?: string | null;
  duration?: string | null;
  coverImageUrl?: string | null;
  streamUrl?: string | null;
  price?: string | number | null;
  communityPrice?: string | number | null;
  previewSeconds?: number | null;
  previewStartSeconds?: number | null;
  previewEndSeconds?: number | null;
  showOnWebsite?: boolean;
  showOnCommunity?: boolean;
  communityPlaybackMode?: "preview" | "full" | "members_full";
  albumShowOnCommunity?: boolean;
  albumPackageMode?: "existing_tracks" | "zip_package" | null;
  albumPackageZipUrl?: string | null;
  albumCommunityPrice?: string | number | null;
  albumEnableOfferPrice?: boolean;
  albumMinimumOfferPrice?: string | number | null;
  albumEnableDonation?: boolean;
  albumAllowIndividualTrackSales?: boolean;
  albumTrackProductIds?: number[] | null;
  isFeatured?: boolean;
  status?: string | null;
}) {
  const endpoint = getWordPressMusicAdminUpsertUrl();

  if (!endpoint) {
    throw new Error("WordPress music admin endpoint is not configured.");
  }

  const payload = await postSignedWordPressJson<WordPressMusicAdminUpsertResponse>(endpoint, {
    product_id: input.productId && input.productId > 0 ? input.productId : null,
    kind: input.kind ?? "track",
    title: input.title,
    description: input.description ?? "",
    artist: input.artist ?? "",
    genre: input.genre ?? "",
    duration: input.duration ?? "",
    cover_image_url: input.coverImageUrl ?? "",
    stream_url: input.streamUrl ?? "",
    price: input.price ?? "",
    community_price: input.communityPrice ?? "",
    preview_seconds:
      typeof input.previewSeconds === "number" && Number.isFinite(input.previewSeconds)
        ? Math.max(5, Math.floor(input.previewSeconds))
        : 30,
    preview_start_seconds:
      typeof input.previewStartSeconds === "number" && Number.isFinite(input.previewStartSeconds)
        ? Math.max(0, Math.floor(input.previewStartSeconds))
        : 0,
    preview_end_seconds:
      typeof input.previewEndSeconds === "number" && Number.isFinite(input.previewEndSeconds)
        ? Math.max(0, Math.floor(input.previewEndSeconds))
        : 0,
    show_on_website: input.showOnWebsite ?? true,
    show_on_community: input.showOnCommunity ?? true,
    community_playback_mode: input.communityPlaybackMode ?? "preview",
    album_show_on_community: input.albumShowOnCommunity ?? input.showOnCommunity ?? true,
    album_package_mode: input.albumPackageMode ?? undefined,
    album_package_zip_url: input.albumPackageZipUrl ?? "",
    album_community_price: input.albumCommunityPrice ?? "",
    album_enable_offer_price: input.albumEnableOfferPrice ?? false,
    album_minimum_offer_price: input.albumMinimumOfferPrice ?? "",
    album_enable_donation: input.albumEnableDonation ?? false,
    album_allow_individual_track_sales: input.albumAllowIndividualTrackSales ?? false,
    album_track_product_ids: Array.isArray(input.albumTrackProductIds)
      ? input.albumTrackProductIds.filter((id) => Number.isInteger(id) && id > 0)
      : undefined,
    is_featured: input.isFeatured ?? false,
    status: input.status ?? "publish",
  });

  if (!payload.success || !payload.product) {
    throw new Error(payload.error || "WordPress did not confirm the music product save.");
  }

  return payload.product;
}

export async function resolveWordPressGiftRecipient(identifier: string) {
  const endpoint = getWordPressGiftRecipientResolveUrl();
  const normalizedIdentifier = identifier.trim();

  if (!endpoint || !normalizedIdentifier) {
    return null;
  }

  try {
    const payload = await postSignedWordPressJson<WordPressGiftRecipientResponse>(endpoint, {
      identifier: normalizedIdentifier,
    });

    if (!payload.success || !payload.recipient?.email) {
      return null;
    }

    return {
      email: payload.recipient.email.toLowerCase(),
      username: payload.recipient.username ?? null,
      wordpress_user_id: payload.recipient.wordpress_user_id ?? null,
      display_name: payload.recipient.display_name ?? null,
    } satisfies WordPressGiftRecipient;
  } catch (error) {
    console.warn("WordPress gift recipient resolve request failed", error);
    return null;
  }
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
  const normalized = new Set<string>();

  for (const role of roles ?? []) {
    if (role === "administrator") {
      normalized.add("super_admin");
      continue;
    }

    if (role === "editor" || role === "author") {
      normalized.add("artist_admin");
      continue;
    }

    if (role === "member" || role === "artist_admin" || role === "super_admin" || role === "moderator") {
      normalized.add(role);
    }
  }

  return Array.from(normalized);
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
  const normalizedAvatar = normalizeOptionalUrl(user.avatar_url);

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name ?? user.email.split("@")[0],
    username: user.username,
    bio: user.bio,
    avatarUrl: resolveAvatarUrl({
      avatarUrl: normalizedAvatar,
      userId: user.id,
      email: user.email,
    }),
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
  const normalizedAvatarUrl = normalizeOptionalUrl(payload.avatar_url);
  const normalizedCoverImageUrl = normalizeOptionalUrl(payload.cover_image_url);
  const normalizedBio = String(payload.bio ?? "").trim() || null;

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
        ${normalizedAvatarUrl},
        ${normalizedCoverImageUrl},
        ${normalizedBio},
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
        currency_code = ${payload.membership?.currency ?? "GBP"},
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
        ${payload.membership?.currency ?? "GBP"},
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

  try {
    const refreshedPlanCode = await syncMembershipStatusFromWordPress({
      userId: user.id,
      email: user.email,
      wordpressUserId: payload.wordpress_user_id,
      wordpressCustomerId: payload.wordpress_customer_id ?? null,
    });

    if (refreshedPlanCode !== undefined) {
      user.activePlanCode = refreshedPlanCode;
    }
  } catch (error) {
    console.warn("WordPress membership refresh during SSO login failed", error);
  }

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

type WordPressStatusPullResponse = {
  success?: boolean;
  user?: {
    email?: string;
    wordpress_user_id?: number | null;
    wordpress_customer_id?: number | null;
  };
  membership?: {
    plan_code?: string | null;
    status?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    auto_renews?: boolean | null;
    amount?: number | null;
    currency?: string | null;
    order_id?: string | number | null;
    subscription_id?: string | number | null;
  } | null;
};

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isMembershipActiveNow(status: string, endsAt: Date | null) {
  const now = Date.now();
  const isNotExpired = !endsAt || endsAt.getTime() > now;

  if (!isNotExpired) {
    return false;
  }

  if (["active", "trialing", "pending", "past_due"].includes(status)) {
    return true;
  }

  // Some subscription systems mark non-renewing but still-valid periods as "cancelled".
  if (status === "cancelled" && endsAt) {
    return endsAt.getTime() > now;
  }

  return false;
}

async function postSignedWordPressJson<TResponse extends object>(
  endpoint: string,
  payload: Record<string, unknown>
) {
  const requestBody = JSON.stringify({
    ...payload,
    timestamp: Math.floor(Date.now() / 1000),
  });
  const signature = createSignature(requestBody);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetchWordPressEndpointWithFallback(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worldnew-signature": signature,
      },
      body: requestBody,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(
        `WordPress sync request failed (${response.status}) at ${endpoint}: ${bodyText || "no response body"}`
      );
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function authenticateAgainstWordPress(email: string, password: string, returnTo?: string | null) {
  const endpoint = getWordPressCredentialAuthUrl();

  if (!endpoint) {
    return { status: "unavailable" } satisfies WordPressCredentialAuthResult;
  }

  try {
    const response = await fetchWordPressEndpointWithFallback(endpoint, {
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

export async function syncMembershipStatusFromWordPress(input: {
  userId: string;
  email: string;
  wordpressUserId?: number | null;
  wordpressCustomerId?: number | null;
}) {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const endpoint = getWordPressSubscriptionStatusUrl();

  if (!endpoint) {
    return undefined as string | null | undefined;
  }

  let statusData: WordPressStatusPullResponse;

  try {
    statusData = await postSignedWordPressJson<WordPressStatusPullResponse>(endpoint, {
      email: input.email.toLowerCase(),
      wordpress_user_id:
        input.wordpressUserId && input.wordpressUserId > 0 ? input.wordpressUserId : null,
      wordpress_customer_id:
        input.wordpressCustomerId && input.wordpressCustomerId > 0
          ? input.wordpressCustomerId
          : null,
    });
  } catch (error) {
    console.warn("WordPress subscription status sync skipped", error);
    return undefined as string | null | undefined;
  }

  if (!statusData.success) {
    return undefined as string | null | undefined;
  }

  const membership = statusData.membership;

  if (!membership?.plan_code) {
    await sql`
      update user_subscriptions
      set
        status = 'expired',
        updated_at = now()
      where user_id = ${input.userId}
        and external_source = 'woocommerce'
        and status in ('active', 'trialing', 'pending', 'past_due')
    `;

    return null;
  }

  const planCode = membership.plan_code.trim();

  const planRows = await sql<{ id: string }[]>`
    select id
    from membership_plans
    where code::text = ${planCode}
    limit 1
  `;
  const plan = planRows[0];

  if (!plan) {
    console.warn(`WordPress membership sync ignored unknown plan code: ${planCode}`);
    return undefined as string | null | undefined;
  }

  const startsAt = parseDate(membership.starts_at) ?? new Date();
  const endsAt = parseDate(membership.ends_at);
  const normalizedStatus = normalizeSubscriptionStatus(membership.status);
  const externalSubscriptionId = membership.subscription_id
    ? String(membership.subscription_id)
    : null;
  const externalOrderId = membership.order_id ? String(membership.order_id) : null;
  const metadata = JSON.stringify({
    source: "wordpress_status_pull",
    membership,
  });

  const currentRow = await sql.begin(async (tx) => {
    const existing = externalSubscriptionId
      ? await tx<{ id: string }[]>`
          select id
          from user_subscriptions
          where external_source = 'woocommerce'
            and external_subscription_id = ${externalSubscriptionId}
          limit 1
        `
      : await tx<{ id: string }[]>`
          select id
          from user_subscriptions
          where user_id = ${input.userId}
            and membership_plan_id = ${plan.id}
            and external_source = 'woocommerce'
          order by updated_at desc
          limit 1
        `;

    if (existing[0]) {
      await tx`
        update user_subscriptions
        set
          membership_plan_id = ${plan.id},
          status = ${normalizedStatus},
          starts_at = ${startsAt.toISOString()},
          ends_at = ${endsAt ? endsAt.toISOString() : null},
          auto_renews = ${Boolean(membership.auto_renews)},
          external_order_id = ${externalOrderId},
          external_subscription_id = ${externalSubscriptionId},
          purchase_amount = ${membership.amount ?? null},
          currency_code = ${membership.currency ?? "GBP"},
          metadata = ${metadata},
          updated_at = now()
        where id = ${existing[0].id}
      `;

      return existing[0].id;
    }

    const inserted = await tx<{ id: string }[]>`
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
        ${input.userId},
        ${plan.id},
        ${normalizedStatus},
        ${startsAt.toISOString()},
        ${endsAt ? endsAt.toISOString() : null},
        ${Boolean(membership.auto_renews)},
        'woocommerce',
        ${externalOrderId},
        ${externalSubscriptionId},
        ${membership.amount ?? null},
        ${membership.currency ?? "GBP"},
        ${metadata}
      )
      returning id
    `;

    return inserted[0].id;
  });

  await sql`
    update user_subscriptions
    set
      status = 'expired',
      updated_at = now()
    where user_id = ${input.userId}
      and external_source = 'woocommerce'
      and id <> ${currentRow}
      and status in ('active', 'trialing', 'pending', 'past_due')
  `;

  return isMembershipActiveNow(normalizedStatus, endsAt) ? planCode : null;
}

export async function syncMembershipPlanPricingToWordPress(input: {
  planCode: string;
  priceAmount: string;
  productId: number;
  variationId?: number | null;
  currencyCode?: string;
  isActive?: boolean;
  durationDays?: number;
}) {
  const endpoint = getWordPressPlanSyncApiUrl();

  if (!endpoint) {
    throw new Error("WORDPRESS_PLAN_SYNC_API_URL or WORDPRESS_BASE_URL is not configured.");
  }

  const payload = {
    plan_code: input.planCode,
    price_amount: input.priceAmount,
    product_id: input.productId,
    variation_id:
      input.variationId && input.variationId > 0 ? input.variationId : null,
    currency: input.currencyCode ?? "GBP",
    is_active: input.isActive ?? true,
    duration_days:
      typeof input.durationDays === "number" && Number.isFinite(input.durationDays)
        ? Math.max(1, Math.floor(input.durationDays))
        : null,
  };

  const result = await postSignedWordPressJson<{
    success?: boolean;
    updated_product_id?: number | null;
    updated_variation_id?: number | null;
  }>(endpoint, payload);

  if (!result.success) {
    throw new Error("WordPress did not confirm plan pricing sync.");
  }

  return result;
}

export async function getCheckoutRedirectUrl(
  planCode: string,
  user: AuthUser,
  options?: {
    returnTo?: string | null;
    giftRecipient?: WordPressGiftRecipient | null;
  }
) {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const checkoutSessionUrl = getWordPressCheckoutSessionUrl();

  if (!checkoutSessionUrl) {
    throw new Error(
      "WORDPRESS_CHECKOUT_SESSION_API_URL or WORDPRESS_BASE_URL is not configured."
    );
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

  const payload: Record<string, unknown> = {
    email: user.email,
    display_name: user.displayName,
    username: user.username,
    product_id: productId,
    variation_id: variationId,
    return_to: options?.returnTo ?? "/dashboard",
  };

  if (options?.giftRecipient?.email) {
    payload.gift_recipient = {
      email: options.giftRecipient.email,
      username: options.giftRecipient.username ?? null,
      wordpress_user_id:
        options.giftRecipient.wordpress_user_id &&
        options.giftRecipient.wordpress_user_id > 0
          ? options.giftRecipient.wordpress_user_id
          : null,
    };
  }

  const result = await postSignedWordPressJson<{
    success?: boolean;
    redirect_url?: string;
    wordpress_user_id?: number | null;
    wordpress_customer_id?: number | null;
  }>(checkoutSessionUrl, payload);

  if (!result.success || !result.redirect_url) {
    throw new Error("WordPress did not return a valid checkout session URL.");
  }

  if (
    (result.wordpress_user_id && result.wordpress_user_id > 0) ||
    (result.wordpress_customer_id && result.wordpress_customer_id > 0)
  ) {
    await sql`
      update users
      set
        wordpress_user_id = coalesce(${result.wordpress_user_id ?? null}, wordpress_user_id),
        wordpress_customer_id = coalesce(${result.wordpress_customer_id ?? null}, wordpress_customer_id),
        updated_at = now()
      where id = ${user.id}
    `;
  }

  return result.redirect_url;
}

export async function getProductCheckoutRedirectUrl(
  productId: number,
  user: AuthUser,
  options?: {
    returnTo?: string | null;
    useCommunityPrice?: boolean;
  }
) {
  const checkoutSessionUrl = getWordPressCheckoutSessionUrl();

  if (!checkoutSessionUrl) {
    throw new Error(
      "WORDPRESS_CHECKOUT_SESSION_API_URL or WORDPRESS_BASE_URL is not configured."
    );
  }

  if (!Number.isFinite(productId) || productId < 1) {
    throw new Error("A valid WooCommerce product id is required.");
  }

  const payload: Record<string, unknown> = {
    email: user.email,
    display_name: user.displayName,
    username: user.username,
    product_id: Math.floor(productId),
    variation_id: null,
    return_to: options?.returnTo ?? "/media/audio",
    use_community_price: options?.useCommunityPrice ?? true,
  };

  const result = await postSignedWordPressJson<{
    success?: boolean;
    redirect_url?: string;
    wordpress_user_id?: number | null;
    wordpress_customer_id?: number | null;
  }>(checkoutSessionUrl, payload);

  if (!result.success || !result.redirect_url) {
    throw new Error("WordPress did not return a valid checkout session URL.");
  }

  const sql = getSql();
  if (
    sql &&
    ((result.wordpress_user_id && result.wordpress_user_id > 0) ||
      (result.wordpress_customer_id && result.wordpress_customer_id > 0))
  ) {
    await sql`
      update users
      set
        wordpress_user_id = coalesce(${result.wordpress_user_id ?? null}, wordpress_user_id),
        wordpress_customer_id = coalesce(${result.wordpress_customer_id ?? null}, wordpress_customer_id),
        updated_at = now()
      where id = ${user.id}
    `;
  }

  return result.redirect_url;
}
