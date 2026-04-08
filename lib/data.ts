import { withDb } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";

export const DEFAULT_PROFILE_COVER_URL =
  "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceAmount: string;
  durationDays: number;
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
  posterImageUrl: string | null;
  createdAt: string;
  planCodes: string[];
  tags: string[];
  featuredArtists: string | null;
  isFeatured: boolean;
};

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

export async function getMembershipPlans(): Promise<Plan[]> {
  return withDb(async (sql) => {
    const rows = await sql<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      price_amount: string;
      duration_days: number;
      feature_list: string[];
    }[]>`
      select id, code::text, name, description, price_amount::text, duration_days, feature_list
      from membership_plans
      where is_active = true
      order by sort_order asc, name asc
    `;

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      priceAmount: row.price_amount,
      durationDays: row.duration_days,
      features: row.feature_list ?? [],
    }));
  }, [
    {
      id: "day-pass",
      code: "day_pass",
      name: "Day Pass",
      description: "A short access pass to sample exclusive songs, videos, and the community.",
      priceAmount: "0.00",
      durationDays: 1,
      features: ["Exclusive songs", "Exclusive videos", "Community access"],
    },
    {
      id: "monthly",
      code: "monthly",
      name: "Pro Monthly",
      description: "Recurring monthly membership for the full premium experience.",
      priceAmount: "0.00",
      durationDays: 30,
      features: ["Everything in Day Pass", "Premium media", "Member-only drops"],
    },
    {
      id: "annual",
      code: "annual",
      name: "Pro Annual",
      description: "Best value for long-term members with the broadest access.",
      priceAmount: "0.00",
      durationDays: 365,
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

export async function getMediaLibrary(): Promise<MediaCard[]> {
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
        end as is_featured
      from media_items m
      left join categories c on c.id = m.category_id
      left join media_plan_access mpa on mpa.media_item_id = m.id
      left join membership_plans mp on mp.id = mpa.membership_plan_id
      where m.status = 'published'
      group by m.id, c.name, c.slug
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
      playbackUrl: row.playback_url,
      posterImageUrl: row.poster_image_url,
      createdAt: row.created_at,
      planCodes: row.plan_codes ?? [],
      tags: row.tags ?? [],
      featuredArtists: row.featured_artists,
      isFeatured: row.is_featured,
    }));
  }, []);
}

export async function getMediaItemById(mediaId: string): Promise<MediaCard | null> {
  const media = await getMediaLibrary();
  return media.find((item) => item.id === mediaId) ?? null;
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
      order by fc.created_at asc
    `;

    return posts.map((post) => ({
      id: post.id,
      body: post.body,
      type: post.post_type,
      createdAt: post.created_at,
      authorName: post.author_name ?? "World New",
      mediaTitle: post.media_title,
      comments: comments
        .filter((comment) => comment.post_id === post.id && !comment.parent_comment_id)
        .map((comment) => ({
          id: comment.id,
          body: comment.body,
          authorName: comment.author_name ?? "Member",
          createdAt: comment.created_at,
          parentCommentId: comment.parent_comment_id,
          replies: comments
            .filter((candidate) => candidate.parent_comment_id === comment.id)
            .map((reply) => ({
              id: reply.id,
              body: reply.body,
              authorName: reply.author_name ?? "Member",
              createdAt: reply.created_at,
            })),
        })),
    }));
  }, []);
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
    await sql`
      create table if not exists app_settings (
        setting_key text primary key,
        setting_value text,
        updated_by uuid references users(id) on delete set null,
        updated_at timestamptz not null default now()
      )
    `;

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
