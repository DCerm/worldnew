import { randomUUID, scryptSync, randomBytes } from "node:crypto";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed the database.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
});

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function getRoleId(code) {
  const rows = await sql`
    select id from roles where code = ${code} limit 1
  `;

  return rows[0]?.id ?? null;
}

async function getPlan(code) {
  const rows = await sql`
    select id, duration_days from membership_plans where code = ${code} limit 1
  `;

  return rows[0] ?? null;
}

async function ensureUser({ email, password, displayName, username, roleCodes, bio, avatarUrl, coverImageUrl }) {
  const existing = await sql`
    select id from users where email = ${email} limit 1
  `;

  const userId = existing[0]?.id ?? randomUUID();

  if (existing[0]) {
    await sql`
      update users
      set
        password_hash = ${hashPassword(password)},
        display_name = ${displayName},
        username = ${username},
        bio = ${bio},
        avatar_url = ${avatarUrl},
        cover_image_url = ${coverImageUrl},
        status = 'active',
        updated_at = now()
      where id = ${userId}
    `;
  } else {
    await sql`
      insert into users (
        id,
        email,
        username,
        password_hash,
        status,
        display_name,
        bio,
        avatar_url,
        cover_image_url
      )
      values (
        ${userId},
        ${email},
        ${username},
        ${hashPassword(password)},
        'active',
        ${displayName},
        ${bio},
        ${avatarUrl},
        ${coverImageUrl}
      )
    `;
  }

  for (const roleCode of roleCodes) {
    const roleId = await getRoleId(roleCode);

    if (roleId) {
      await sql`
        insert into user_roles (user_id, role_id)
        values (${userId}, ${roleId})
        on conflict do nothing
      `;
    }
  }

  return userId;
}

async function ensureCategory(name, description, createdBy) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const rows = await sql`
    insert into categories (slug, name, description, created_by)
    values (${slug}, ${name}, ${description}, ${createdBy})
    on conflict (slug) do update
    set name = excluded.name, description = excluded.description, updated_at = now()
    returning id
  `;

  return rows[0].id;
}

async function ensureMedia({ title, description, mediaType, visibility, categoryId, uploadedBy, playbackUrl, posterImageUrl, planCode }) {
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${mediaType}`;
  const existing = await sql`
    select id from media_items where slug = ${slug} limit 1
  `;

  const mediaId = existing[0]?.id ?? randomUUID();

  if (existing[0]) {
    await sql`
      update media_items
      set
        title = ${title},
        description = ${description},
        visibility = ${visibility},
        category_id = ${categoryId},
        uploaded_by = ${uploadedBy},
        playback_url = ${playbackUrl},
        poster_image_url = ${posterImageUrl},
        status = 'published',
        published_at = now(),
        updated_at = now()
      where id = ${mediaId}
    `;
  } else {
    await sql`
      insert into media_items (
        id,
        title,
        slug,
        description,
        media_type,
        status,
        visibility,
        category_id,
        uploaded_by,
        poster_image_url,
        playback_url,
        published_at
      )
      values (
        ${mediaId},
        ${title},
        ${slug},
        ${description},
        ${mediaType},
        'published',
        ${visibility},
        ${categoryId},
        ${uploadedBy},
        ${posterImageUrl},
        ${playbackUrl},
        now()
      )
    `;

    await sql`
      insert into feed_posts (author_id, post_type, body, media_item_id)
      values (${uploadedBy}, 'media_announcement', ${`World New just released ${title}.`}, ${mediaId})
    `;
  }

  if (visibility === "plan_specific" && planCode) {
    const plan = await getPlan(planCode);

    if (plan) {
      await sql`
        insert into media_plan_access (media_item_id, membership_plan_id)
        values (${mediaId}, ${plan.id})
        on conflict do nothing
      `;
    }
  }

  return mediaId;
}

async function ensureSubscription(userId, planCode) {
  const plan = await getPlan(planCode);

  if (!plan) {
    return;
  }

  const existing = await sql`
    select id from user_subscriptions
    where user_id = ${userId}
      and membership_plan_id = ${plan.id}
      and status = 'active'
    limit 1
  `;

  if (existing[0]) {
    return;
  }

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + Number(plan.duration_days));

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
      ${userId},
      ${plan.id},
      'active',
      ${startsAt.toISOString()},
      ${endsAt.toISOString()},
      false,
      'seed'
    )
  `;
}

async function ensureTextPost(authorId, body) {
  const existing = await sql`
    select id from feed_posts where body = ${body} limit 1
  `;

  if (!existing[0]) {
    await sql`
      insert into feed_posts (author_id, post_type, body)
      values (${authorId}, 'text', ${body})
    `;
  }
}

async function main() {
  const artistId = await ensureUser({
    email: "artist@worldnew.love",
    password: "artist1234",
    displayName: "World New Artist",
    username: "worldnewartist",
    roleCodes: ["member", "artist_admin"],
    bio: "Artist account for uploading premium media and managing the community.",
    avatarUrl: "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp",
    coverImageUrl: "https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp",
  });

  const memberId = await ensureUser({
    email: "member@worldnew.love",
    password: "member1234",
    displayName: "Demo Member",
    username: "demomember",
    roleCodes: ["member"],
    bio: "Member account for testing gated media and community flows.",
    avatarUrl: "",
    coverImageUrl: "",
  });

  await ensureSubscription(memberId, "monthly");

  const singlesId = await ensureCategory("Singles", "Official releases and spotlight tracks.", artistId);
  const studioId = await ensureCategory("Studio Performances", "Live room and studio session videos.", artistId);
  const docsId = await ensureCategory("Documentaries", "Behind-the-scenes and spiritual content.", artistId);

  await ensureMedia({
    title: "World New Dawn",
    description: "A public audio release to test open access.",
    mediaType: "audio",
    visibility: "public",
    categoryId: singlesId,
    uploadedBy: artistId,
    playbackUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    posterImageUrl: "",
    planCode: "",
  });

  await ensureMedia({
    title: "Studio Fire Session",
    description: "Premium community video with a monthly gate.",
    mediaType: "video",
    visibility: "plan_specific",
    categoryId: studioId,
    uploadedBy: artistId,
    playbackUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    posterImageUrl: "",
    planCode: "monthly",
  });

  await ensureMedia({
    title: "The Coming Of The World New",
    description: "Paid documentary content for members.",
    mediaType: "video",
    visibility: "paid",
    categoryId: docsId,
    uploadedBy: artistId,
    playbackUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    posterImageUrl: "",
    planCode: "",
  });

  await ensureTextPost(artistId, "Welcome to the rebuilt World New community. New uploads will appear here automatically.");
  await ensureTextPost(memberId, "Happy to be here. Testing the member feed and commenting flow.");

  console.log("Seed complete.");
  console.log("Artist login: artist@worldnew.love / artist1234");
  console.log("Member login: member@worldnew.love / member1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
