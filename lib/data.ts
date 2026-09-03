import { withDb } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import {
  getWordPressMusicProductsForAdmin,
  getWordPressPlanPrices,
  type WordPressMusicProduct,
} from "@/lib/wordpress";
import {
  createSignedMediaStreamUrl,
  normalizePreviewSeconds,
  resolvePublicMediaAssetUrl,
} from "@/lib/media-stream";

export const DEFAULT_PROFILE_COVER_URL =
  "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp";

export type MembershipPlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceAmount: string;
  currencyCode: string;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  wordpressProductId: number | null;
  wordpressVariationId: number | null;
  features: string[];
};

export type MediaCard = {
  id: string;
  title: string;
  description: string | null;
  mediaType: "audio" | "video";
  visibility: "public" | "community" | "paid" | "plan_specific" | "custom_allowlist";
  categoryName: string | null;
  categorySlug: string | null;
  playbackUrl: string | null;
  rawPlaybackUrl: string | null;
  posterImageUrl: string | null;
  createdAt: string;
  planCodes: string[];
  tags: string[];
  featuredArtists: string | null;
  isFeatured: boolean;
  hiddenFromPublicPages: boolean;
  previewSeconds: number;
  previewStartSeconds?: number | null;
  previewEndSeconds?: number | null;
  fullPlaybackUrl: string | null;
  communityPlaybackMode?: "preview" | "full" | "members_full";
  sourceProductUrl?: string | null;
};

const WORDPRESS_VIDEO_CATEGORY_LABELS: Record<string, string> = {
  movies: "Movies",
  reels: "Reels",
  mixtapes: "Mixtapes",
  "behind-the-scenes": "Behind the Scenes",
};

function wordpressVideoProductToMediaCard(product: WordPressMusicProduct): MediaCard | null {
  if (product.kind !== "video" || product.show_on_community === false || !product.stream_url) {
    return null;
  }

  const categorySlug = product.community_category ?? "behind-the-scenes";
  const playbackMode = product.community_playback_mode === "members_full" ? "members_full" : "full";

  return {
    id: `wp-video-${product.id}`,
    title: product.title,
    description: product.short_description || product.description || null,
    mediaType: "video",
    visibility: "community",
    categoryName: WORDPRESS_VIDEO_CATEGORY_LABELS[categorySlug] ?? "Behind the Scenes",
    categorySlug,
    playbackUrl: product.stream_url,
    rawPlaybackUrl: product.stream_url,
    posterImageUrl: product.poster_image_url || product.cover_image_url || null,
    createdAt: new Date().toISOString(),
    planCodes: [],
    tags: product.category_slugs ?? [],
    featuredArtists: null,
    isFeatured: Boolean(product.is_featured),
    hiddenFromPublicPages: false,
    previewSeconds: normalizePreviewSeconds(product.preview_seconds),
    previewStartSeconds: product.preview_start_seconds ?? 0,
    previewEndSeconds: product.preview_end_seconds ?? null,
    fullPlaybackUrl: product.stream_url,
    communityPlaybackMode: playbackMode,
    sourceProductUrl: product.product_url,
  };
}

function wordpressAudioProductToMediaCard(product: WordPressMusicProduct): MediaCard | null {
  if (product.kind !== "track" || product.show_on_community === false || !product.stream_url) {
    return null;
  }

  const playbackMode = product.community_playback_mode ?? "preview";

  return {
    id: `wp-audio-${product.id}`,
    title: product.title,
    description: product.short_description || product.description || null,
    mediaType: "audio",
    visibility: playbackMode === "members_full" ? "paid" : "community",
    categoryName: "Music",
    categorySlug: "music",
    playbackUrl: product.stream_url,
    rawPlaybackUrl: product.stream_url,
    posterImageUrl: product.cover_image_url || null,
    createdAt: product.published_at ?? new Date().toISOString(),
    planCodes: [],
    tags: product.category_slugs ?? [],
    featuredArtists: product.artist || null,
    isFeatured: Boolean(product.is_featured),
    hiddenFromPublicPages: false,
    previewSeconds: normalizePreviewSeconds(product.preview_seconds),
    previewStartSeconds: product.preview_start_seconds ?? 0,
    previewEndSeconds: product.preview_end_seconds ?? null,
    fullPlaybackUrl: product.stream_url,
    communityPlaybackMode: playbackMode,
    sourceProductUrl: product.product_url,
  };
}

async function getWordPressVideoMediaCards(): Promise<MediaCard[]> {
  const products = await getWordPressMusicProductsForAdmin();

  return products
    .map(wordpressVideoProductToMediaCard)
    .filter((item): item is MediaCard => Boolean(item));
}

async function getWordPressAudioMediaCards(): Promise<MediaCard[]> {
  const products = await getWordPressMusicProductsForAdmin();

  return products
    .map(wordpressAudioProductToMediaCard)
    .filter((item): item is MediaCard => Boolean(item));
}

export async function getWordPressVideoMediaItemById(mediaId: string): Promise<MediaCard | null> {
  if (!mediaId.startsWith("wp-video-")) {
    return null;
  }

  const productId = Number(mediaId.replace("wp-video-", ""));
  if (!Number.isFinite(productId) || productId < 1) {
    return null;
  }

  const media = await getWordPressVideoMediaCards();
  return media.find((item) => item.id === mediaId) ?? null;
}

export async function getWordPressAudioMediaItemById(mediaId: string): Promise<MediaCard | null> {
  if (!mediaId.startsWith("wp-audio-")) {
    return null;
  }

  const productId = Number(mediaId.replace("wp-audio-", ""));
  if (!Number.isFinite(productId) || productId < 1) {
    return null;
  }

  const media = await getWordPressAudioMediaCards();
  return media.find((item) => item.id === mediaId) ?? null;
}

export type FeedPost = {
  id: string;
  body: string | null;
  type: string;
  createdAt: string;
  authorName: string;
  mediaTitle: string | null;
  comments: {
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
    parentCommentId: string | null;
    replies: {
      id: string;
      body: string;
      authorName: string;
      createdAt: string;
    }[];
  }[];
};

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type CommunityGroupSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  visibility: "public" | "private" | "secret";
  topicCount: number;
  memberCount: number;
};

export type CommunityTopicSummary = {
  id: string;
  groupId: string;
  groupSlug: string;
  groupName: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  threadCount: number;
};

async function ensureCommunityGroupDefaults(sql: Parameters<Parameters<typeof withDb>[0]>[0]) {
  await sql`
    alter table groups
    add column if not exists sort_order integer not null default 0
  `;

  const countRows = await sql<{ count: number }[]>`
    select count(*)::int as count
    from groups
  `;

  if ((countRows[0]?.count ?? 0) > 0) {
    return;
  }

  const ownerRows = await sql<{ id: string }[]>`
    select u.id
    from users u
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    order by
      case when r.code in ('super_admin', 'artist_admin') then 0 else 1 end,
      u.created_at asc
    limit 1
  `;
  const ownerId = ownerRows[0]?.id;

  if (!ownerId) {
    return;
  }

  await sql`
    insert into groups (slug, name, description, sort_order, visibility, owner_id)
    values (
      'community-updates',
      'Community Updates',
      'Updates, questions, and direct conversations with the artist.',
      0,
      'public'::group_visibility,
      ${ownerId}
    )
    on conflict (slug) do nothing
  `;
}

export type CommunityThreadReply = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  parentReplyId: string | null;
};

export type CommunityThreadDetail = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  isPinned: boolean;
  isLocked: boolean;
  replies: CommunityThreadReply[];
};

type MediaLibraryOptions = {
  limit?: number;
  includeHidden?: boolean;
};

function normalizeFeatureList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((entry) => String(entry ?? "").trim())
            .filter(Boolean);
        }
      } catch {
        // Fall through to delimiter-based parsing below.
      }
    }

    return trimmed
      .split(/\r?\n|,/g)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export async function getMembershipPlans(
  options: { includeInactive?: boolean } = {}
): Promise<MembershipPlan[]> {
  const includeInactive = Boolean(options.includeInactive);

  return withDb(async (sql) => {
    const rows = await sql<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      price_amount: string;
      currency_code: string;
      duration_days: number;
      is_active: boolean;
      sort_order: number;
      wordpress_product_id: number | null;
      wordpress_variation_id: number | null;
      feature_list: unknown;
    }[]>`
      select
        id,
        code::text,
        name,
        description,
        price_amount::text,
        currency_code::text,
        duration_days,
        is_active,
        sort_order,
        wordpress_product_id,
        wordpress_variation_id,
        feature_list
      from membership_plans
      ${includeInactive ? sql`` : sql`where is_active = true`}
      order by sort_order asc, name asc
    `;

    const basePlans = rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      priceAmount: row.price_amount,
      currencyCode: row.currency_code,
      durationDays: row.duration_days,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      wordpressProductId: row.wordpress_product_id,
      wordpressVariationId: row.wordpress_variation_id,
      features: normalizeFeatureList(row.feature_list),
    }));

    const wordpressPrices = await getWordPressPlanPrices(
      basePlans.map((plan) => ({
        planCode: plan.code,
        productId: plan.wordpressProductId,
        variationId: plan.wordpressVariationId,
      }))
    );

    return basePlans.map((plan) => {
      const wordpressPrice = wordpressPrices.get(plan.code);

      if (!wordpressPrice?.price_amount) {
        return plan;
      }

      return {
        ...plan,
        priceAmount: wordpressPrice.price_amount,
        currencyCode: wordpressPrice.currency || plan.currencyCode,
      };
    });
  }, [
    {
      id: "day-pass",
      code: "day_pass",
      name: "Day Pass",
      description: "A short access pass to sample exclusive songs, videos, and the community.",
      priceAmount: "0.00",
      currencyCode: "GBP",
      durationDays: 1,
      isActive: true,
      sortOrder: 0,
      wordpressProductId: null,
      wordpressVariationId: null,
      features: ["Exclusive songs", "Exclusive videos", "Community access"],
    },
    {
      id: "monthly",
      code: "monthly",
      name: "Pro Monthly",
      description: "Recurring monthly membership for the full premium experience.",
      priceAmount: "0.00",
      currencyCode: "GBP",
      durationDays: 30,
      isActive: true,
      sortOrder: 1,
      wordpressProductId: null,
      wordpressVariationId: null,
      features: ["Everything in Day Pass", "Premium media", "Member-only drops"],
    },
    {
      id: "annual",
      code: "annual",
      name: "Pro Annual",
      description: "Best value for long-term members with the broadest access.",
      priceAmount: "0.00",
      currencyCode: "GBP",
      durationDays: 365,
      isActive: true,
      sortOrder: 2,
      wordpressProductId: null,
      wordpressVariationId: null,
      features: ["Everything in Monthly", "Annual savings", "Priority access"],
    },
  ]);
}

export async function getCategories(): Promise<CategoryRecord[]> {
  return withDb(async (sql) => {
    const rows = await sql<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
    }[]>`
      select id, name, slug, description
      from categories
      order by name asc
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
    }));
  }, []);
}

export async function getMediaLibrary(options: MediaLibraryOptions = {}): Promise<MediaCard[]> {
  const limit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(Math.floor(options.limit), 100))
      : null;
  const includeHidden = Boolean(options.includeHidden);

  const localMedia = await withDb(async (sql) => {
    const rows = await sql<{
      id: string;
      title: string;
      description: string | null;
      media_type: "audio" | "video";
      visibility: MediaCard["visibility"];
      category_name: string | null;
      category_slug: string | null;
      playback_url: string | null;
      poster_image_url: string | null;
      created_at: string;
      plan_codes: string[] | null;
      tags: string[] | null;
      featured_artists: string | null;
      is_featured: boolean;
      hidden_from_public_pages: boolean;
      preview_seconds: number;
    }[]>`
      with scoped_media as (
        select *
        from media_items
        where status = 'published'
          ${
            includeHidden
              ? sql``
              : sql`and lower(coalesce(metadata->>'hide_from_public_pages', 'false')) not in ('true', 't', '1', 'yes', 'on')`
          }
        order by created_at desc
        ${limit ? sql`limit ${limit}` : sql``}
      )
      select
        m.id,
        m.title,
        m.description,
        m.media_type,
        m.visibility,
        c.name as category_name,
        c.slug as category_slug,
        m.playback_url,
        m.poster_image_url,
        m.created_at::text,
        coalesce(array_agg(distinct mp.code::text) filter (where mp.code is not null), '{}'::text[]) as plan_codes,
        case
          when jsonb_typeof(coalesce(m.tags, '[]'::jsonb)) = 'array'
            then coalesce(array(select jsonb_array_elements_text(m.tags)), '{}'::text[])
          else '{}'::text[]
        end as tags,
        nullif(m.metadata->>'featured_artists', '') as featured_artists,
        case
          when lower(coalesce(m.metadata->>'is_featured', 'false')) in ('true', 't', '1', 'yes', 'on')
            then true
          else false
        end as is_featured,
        case
          when lower(coalesce(m.metadata->>'hide_from_public_pages', 'false')) in ('true', 't', '1', 'yes', 'on')
            then true
          else false
        end as hidden_from_public_pages,
        case
          when nullif(regexp_replace(coalesce(m.metadata->>'preview_seconds', ''), '[^0-9]', '', 'g'), '') is not null
            then greatest(5, (nullif(regexp_replace(coalesce(m.metadata->>'preview_seconds', ''), '[^0-9]', '', 'g'), ''))::int)
          else 30
        end as preview_seconds
      from scoped_media m
      left join categories c on c.id = m.category_id
      left join media_plan_access mpa on mpa.media_item_id = m.id
      left join membership_plans mp on mp.id = mpa.membership_plan_id
      group by
        m.id,
        m.title,
        m.description,
        m.media_type,
        m.visibility,
        c.name,
        c.slug,
        m.playback_url,
        m.poster_image_url,
        m.created_at,
        m.tags,
        m.metadata
      order by m.created_at desc
    `;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      mediaType: row.media_type,
      visibility: row.visibility,
      categoryName: row.category_name,
      categorySlug: row.category_slug,
      playbackUrl: row.playback_url
        ? createSignedMediaStreamUrl({ mediaId: row.id, mode: "preview" })
        : null,
      rawPlaybackUrl: row.playback_url,
      posterImageUrl: resolvePublicMediaAssetUrl(row.poster_image_url),
      createdAt: row.created_at,
      planCodes: row.plan_codes ?? [],
      tags: row.tags ?? [],
      featuredArtists: row.featured_artists,
      isFeatured: row.is_featured,
      hiddenFromPublicPages: row.hidden_from_public_pages,
      previewSeconds: normalizePreviewSeconds(row.preview_seconds),
      fullPlaybackUrl: row.playback_url
        ? createSignedMediaStreamUrl({ mediaId: row.id, mode: "full" })
        : null,
    }));
  }, []);

  const [wordpressVideos, wordpressAudios] = await Promise.all([
    getWordPressVideoMediaCards(),
    getWordPressAudioMediaCards(),
  ]);

  return [
    ...wordpressVideos,
    ...wordpressAudios,
    ...localMedia.filter((item) => item.mediaType === "video"),
  ];
}

export async function getMediaItemById(mediaId: string): Promise<MediaCard | null> {
  const wordpressVideo = await getWordPressVideoMediaItemById(mediaId);
  if (wordpressVideo) {
    return wordpressVideo;
  }

  const wordpressAudio = await getWordPressAudioMediaItemById(mediaId);
  if (wordpressAudio) {
    return wordpressAudio;
  }

  return withDb(async (sql) => {
    const rows = await sql<{
      id: string;
      title: string;
      description: string | null;
      media_type: "audio" | "video";
      visibility: MediaCard["visibility"];
      category_name: string | null;
      category_slug: string | null;
      playback_url: string | null;
      poster_image_url: string | null;
      created_at: string;
      plan_codes: string[] | null;
      tags: string[] | null;
      featured_artists: string | null;
      is_featured: boolean;
      hidden_from_public_pages: boolean;
      preview_seconds: number;
    }[]>`
      select
        m.id,
        m.title,
        m.description,
        m.media_type,
        m.visibility,
        c.name as category_name,
        c.slug as category_slug,
        m.playback_url,
        m.poster_image_url,
        m.created_at::text,
        coalesce(array_agg(distinct mp.code::text) filter (where mp.code is not null), '{}'::text[]) as plan_codes,
        case
          when jsonb_typeof(coalesce(m.tags, '[]'::jsonb)) = 'array'
            then coalesce(array(select jsonb_array_elements_text(m.tags)), '{}'::text[])
          else '{}'::text[]
        end as tags,
        nullif(m.metadata->>'featured_artists', '') as featured_artists,
        case
          when lower(coalesce(m.metadata->>'is_featured', 'false')) in ('true', 't', '1', 'yes', 'on')
            then true
          else false
        end as is_featured,
        case
          when lower(coalesce(m.metadata->>'hide_from_public_pages', 'false')) in ('true', 't', '1', 'yes', 'on')
            then true
          else false
        end as hidden_from_public_pages,
        case
          when nullif(regexp_replace(coalesce(m.metadata->>'preview_seconds', ''), '[^0-9]', '', 'g'), '') is not null
            then greatest(5, (nullif(regexp_replace(coalesce(m.metadata->>'preview_seconds', ''), '[^0-9]', '', 'g'), ''))::int)
          else 30
        end as preview_seconds
      from media_items m
      left join categories c on c.id = m.category_id
      left join media_plan_access mpa on mpa.media_item_id = m.id
      left join membership_plans mp on mp.id = mpa.membership_plan_id
      where m.status = 'published'
        and m.id = ${mediaId}
      group by m.id, c.name, c.slug
      limit 1
    `;

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      mediaType: row.media_type,
      visibility: row.visibility,
      categoryName: row.category_name,
      categorySlug: row.category_slug,
      playbackUrl: row.playback_url
        ? createSignedMediaStreamUrl({ mediaId: row.id, mode: "preview" })
        : null,
      rawPlaybackUrl: row.playback_url,
      posterImageUrl: resolvePublicMediaAssetUrl(row.poster_image_url),
      createdAt: row.created_at,
      planCodes: row.plan_codes ?? [],
      tags: row.tags ?? [],
      featuredArtists: row.featured_artists,
      isFeatured: row.is_featured,
      hiddenFromPublicPages: row.hidden_from_public_pages,
      previewSeconds: normalizePreviewSeconds(row.preview_seconds),
      fullPlaybackUrl: row.playback_url
        ? createSignedMediaStreamUrl({ mediaId: row.id, mode: "full" })
        : null,
    };
  }, null);
}

export async function getCommunityFeed(): Promise<FeedPost[]> {
  return withDb(async (sql) => {
    const posts = await sql<{
      id: string;
      body: string | null;
      post_type: string;
      created_at: string;
      author_name: string | null;
      media_title: string | null;
    }[]>`
      select
        fp.id,
        fp.body,
        fp.post_type::text,
        fp.created_at::text,
        u.display_name as author_name,
        m.title as media_title
      from feed_posts fp
      left join users u on u.id = fp.author_id
      left join media_items m on m.id = fp.media_item_id
      order by fp.created_at desc
      limit 20
    `;

    const comments = await sql<{
      id: string;
      post_id: string;
      body: string;
      created_at: string;
      author_name: string | null;
      parent_comment_id: string | null;
    }[]>`
      select
        fc.id,
        fc.post_id,
        fc.body,
        fc.created_at::text,
        u.display_name as author_name,
        fc.parent_comment_id::text
      from feed_comments fc
      join users u on u.id = fc.author_id
      where fc.post_id in (
        select id
        from feed_posts
        order by created_at desc
        limit 20
      )
      order by fc.created_at asc
    `;

    const topLevelByPost = new Map<
      string,
      Array<{
        id: string;
        body: string;
        authorName: string;
        createdAt: string;
        parentCommentId: string | null;
      }>
    >();
    const repliesByParent = new Map<
      string,
      Array<{
        id: string;
        body: string;
        authorName: string;
        createdAt: string;
      }>
    >();

    for (const comment of comments) {
      if (comment.parent_comment_id) {
        if (!repliesByParent.has(comment.parent_comment_id)) {
          repliesByParent.set(comment.parent_comment_id, []);
        }

        repliesByParent.get(comment.parent_comment_id)!.push({
          id: comment.id,
          body: comment.body,
          authorName: comment.author_name ?? "Member",
          createdAt: comment.created_at,
        });

        continue;
      }

      if (!topLevelByPost.has(comment.post_id)) {
        topLevelByPost.set(comment.post_id, []);
      }

      topLevelByPost.get(comment.post_id)!.push({
        id: comment.id,
        body: comment.body,
        authorName: comment.author_name ?? "Member",
        createdAt: comment.created_at,
        parentCommentId: comment.parent_comment_id,
      });
    }

    return posts.map((post) => ({
      id: post.id,
      body: post.body,
      type: post.post_type,
      createdAt: post.created_at,
      authorName: post.author_name ?? "World New",
      mediaTitle: post.media_title,
      comments: (topLevelByPost.get(post.id) ?? []).map((comment) => ({
          id: comment.id,
          body: comment.body,
          authorName: comment.authorName,
          createdAt: comment.createdAt,
          parentCommentId: comment.parentCommentId,
          replies: repliesByParent.get(comment.id) ?? [],
        })),
    }));
  }, []);
}

export async function getCommunityGroups(): Promise<CommunityGroupSummary[]> {
  return withDb(async (sql) => {
    await ensureCommunityGroupDefaults(sql);

    const rows = await sql<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      sort_order: number;
      visibility: "public" | "private" | "secret";
      topic_count: number;
      member_count: number;
    }[]>`
      select
        g.id,
        g.slug,
        g.name,
        g.description,
        g.sort_order,
        g.visibility::text as visibility,
        count(distinct ct.id)::int as topic_count,
        count(distinct gm.user_id)::int as member_count
      from groups g
      left join community_topics ct on ct.group_id = g.id
      left join group_members gm on gm.group_id = g.id
      group by g.id, g.slug, g.name, g.description, g.sort_order, g.visibility
      order by g.sort_order asc, g.name asc
    `;

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
      visibility: row.visibility,
      topicCount: row.topic_count,
      memberCount: row.member_count,
    }));
  }, []);
}

export async function getCommunityTopicsByGroupSlug(groupSlug: string): Promise<{
  group: CommunityGroupSummary | null;
  topics: CommunityTopicSummary[];
}> {
  return withDb(async (sql) => {
    await ensureCommunityGroupDefaults(sql);

    const groupRows = await sql<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      sort_order: number;
      visibility: "public" | "private" | "secret";
      topic_count: number;
      member_count: number;
    }[]>`
      select
        g.id,
        g.slug,
        g.name,
        g.description,
        g.sort_order,
        g.visibility::text as visibility,
        count(distinct ct.id)::int as topic_count,
        count(distinct gm.user_id)::int as member_count
      from groups g
      left join community_topics ct on ct.group_id = g.id
      left join group_members gm on gm.group_id = g.id
      where g.slug = ${groupSlug}
      group by g.id, g.slug, g.name, g.description, g.sort_order, g.visibility
      limit 1
    `;

    const group = groupRows[0]
      ? {
          id: groupRows[0].id,
          slug: groupRows[0].slug,
          name: groupRows[0].name,
          description: groupRows[0].description,
          sortOrder: groupRows[0].sort_order,
          visibility: groupRows[0].visibility,
          topicCount: groupRows[0].topic_count,
          memberCount: groupRows[0].member_count,
        }
      : null;

    if (!group) {
      return { group: null, topics: [] };
    }

    const topicRows = await sql<{
      id: string;
      group_id: string;
      group_slug: string;
      group_name: string;
      slug: string;
      title: string;
      description: string | null;
      sort_order: number;
      thread_count: number;
    }[]>`
      select
        ct.id,
        ct.group_id,
        g.slug as group_slug,
        g.name as group_name,
        ct.slug,
        ct.title,
        ct.description,
        ct.sort_order,
        count(distinct cth.id)::int as thread_count
      from community_topics ct
      join groups g on g.id = ct.group_id
      left join community_threads cth on cth.topic_id = ct.id
      where g.slug = ${groupSlug}
      group by
        ct.id,
        ct.group_id,
        g.slug,
        g.name,
        ct.slug,
        ct.title,
        ct.description,
        ct.sort_order
      order by ct.sort_order asc, ct.title asc
    `;

    return {
      group,
      topics: topicRows.map((row) => ({
        id: row.id,
        groupId: row.group_id,
        groupSlug: row.group_slug,
        groupName: row.group_name,
        slug: row.slug,
        title: row.title,
        description: row.description,
        sortOrder: row.sort_order,
        threadCount: row.thread_count,
      })),
    };
  }, { group: null, topics: [] });
}

export async function getCommunityThreadsByTopic(groupSlug: string, topicSlug: string): Promise<{
  group: CommunityGroupSummary | null;
  topic: CommunityTopicSummary | null;
  threads: CommunityThreadDetail[];
}> {
  return withDb(async (sql) => {
    const topicRows = await sql<{
      group_id: string;
      group_slug: string;
      group_name: string;
      group_description: string | null;
      group_sort_order: number;
      group_visibility: "public" | "private" | "secret";
      member_count: number;
      topic_id: string;
      topic_slug: string;
      topic_title: string;
      topic_description: string | null;
      topic_sort_order: number;
      thread_count: number;
    }[]>`
      select
        g.id as group_id,
        g.slug as group_slug,
        g.name as group_name,
        g.description as group_description,
        g.sort_order as group_sort_order,
        g.visibility::text as group_visibility,
        (
          select count(*)::int
          from group_members gm
          where gm.group_id = g.id
        ) as member_count,
        ct.id as topic_id,
        ct.slug as topic_slug,
        ct.title as topic_title,
        ct.description as topic_description,
        ct.sort_order as topic_sort_order,
        (
          select count(*)::int
          from community_threads cth
          where cth.topic_id = ct.id
        ) as thread_count
      from groups g
      join community_topics ct on ct.group_id = g.id
      where g.slug = ${groupSlug}
        and ct.slug = ${topicSlug}
      limit 1
    `;

    const joined = topicRows[0];
    if (!joined) {
      return { group: null, topic: null, threads: [] };
    }

    const threads = await sql<{
      id: string;
      title: string;
      body: string;
      is_pinned: boolean;
      is_locked: boolean;
      created_at: string;
      author_name: string | null;
    }[]>`
      select
        cth.id,
        cth.title,
        cth.body,
        cth.is_pinned,
        cth.is_locked,
        cth.created_at::text,
        u.display_name as author_name
      from community_threads cth
      left join users u on u.id = cth.author_id
      where cth.topic_id = ${joined.topic_id}
      order by cth.is_pinned desc, cth.created_at desc
    `;

    const replies = await sql<{
      id: string;
      thread_id: string;
      parent_reply_id: string | null;
      body: string;
      created_at: string;
      author_name: string | null;
    }[]>`
      select
        ctr.id,
        ctr.thread_id,
        ctr.parent_reply_id::text,
        ctr.body,
        ctr.created_at::text,
        u.display_name as author_name
      from community_thread_replies ctr
      left join users u on u.id = ctr.author_id
      where ctr.thread_id in (
        select id
        from community_threads
        where topic_id = ${joined.topic_id}
      )
      order by ctr.created_at asc
    `;

    const repliesByThread = new Map<string, CommunityThreadReply[]>();
    for (const reply of replies) {
      if (!repliesByThread.has(reply.thread_id)) {
        repliesByThread.set(reply.thread_id, []);
      }
      repliesByThread.get(reply.thread_id)!.push({
        id: reply.id,
        body: reply.body,
        authorName: reply.author_name ?? "Member",
        createdAt: reply.created_at,
        parentReplyId: reply.parent_reply_id,
      });
    }

    return {
      group: {
        id: joined.group_id,
        slug: joined.group_slug,
        name: joined.group_name,
        description: joined.group_description,
        sortOrder: joined.group_sort_order,
        visibility: joined.group_visibility,
        topicCount: 0,
        memberCount: joined.member_count,
      },
      topic: {
        id: joined.topic_id,
        groupId: joined.group_id,
        groupSlug: joined.group_slug,
        groupName: joined.group_name,
        slug: joined.topic_slug,
        title: joined.topic_title,
        description: joined.topic_description,
        sortOrder: joined.topic_sort_order,
        threadCount: joined.thread_count,
      },
      threads: threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        body: thread.body,
        authorName: thread.author_name ?? "Member",
        createdAt: thread.created_at,
        isPinned: thread.is_pinned,
        isLocked: thread.is_locked,
        replies: repliesByThread.get(thread.id) ?? [],
      })),
    };
  }, { group: null, topic: null, threads: [] });
}

export async function getAdminOverview() {
  const [categories, mediaItems, posts, plans] = await Promise.all([
    getCategories(),
    getMediaLibrary(),
    getCommunityFeed(),
    getMembershipPlans(),
  ]);

  return {
    categories,
    mediaItems,
    posts,
    plans,
  };
}

export async function getGlobalProfileCoverUrl(): Promise<string | null> {
  return withDb(async (sql) => {
    const rows = await sql<{ setting_value: string | null }[]>`
      select setting_value
      from app_settings
      where setting_key = 'global_profile_cover_url'
      limit 1
    `;

    return rows[0]?.setting_value ?? null;
  }, null);
}

export function canAccessMedia(user: AuthUser | null, media: MediaCard) {
  if (media.visibility === "public") {
    return true;
  }

  if (!user) {
    return false;
  }

  if (user.roles.includes("artist_admin") || user.roles.includes("super_admin")) {
    return true;
  }

  if (media.visibility === "community") {
    return true;
  }

  if (media.visibility === "paid") {
    return Boolean(user.activePlanCode);
  }

  if (media.visibility === "plan_specific") {
    return Boolean(user.activePlanCode && media.planCodes.includes(user.activePlanCode));
  }

  return false;
}

export function getVisibilityLabel(visibility: MediaCard["visibility"]) {
  switch (visibility) {
    case "public":
      return "Public";
    case "community":
      return "Community";
    case "paid":
      return "Paid members";
    case "plan_specific":
      return "Specific plans";
    default:
      return "Restricted";
  }
}
