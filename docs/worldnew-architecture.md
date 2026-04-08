# World New Architecture Blueprint

## Product Direction

`worldnew` should become a two-surface platform:

1. A public marketing site with membership upsells and plan comparison.
2. A logged-in community product with:
   - user dashboard
   - artist/admin dashboard
   - gated media library
   - community feed, comments, reactions, follows, friendships, DMs, and groups

The existing Next.js app is currently a UI prototype. It does not yet have a real auth layer, database, file storage, role model, subscriptions, or synchronization with WordPress.

## Recommendation: Authentication Ownership

For your setup, the best phase-1 choice is:

- Keep **WordPress/WooCommerce as the commerce source of truth**
- Let **WordPress also be the identity authority for customer login**
- Let the Next.js app trust that identity and maintain its own application profile, roles, and entitlements in Postgres

### Why this is the better fit

- WooCommerce checkout, orders, billing details, and customer records already live in WordPress.
- If WordPress owns the login, a signed-in member can move into checkout with the same customer identity and without duplicating account details.
- Social login is easier to centralize once on the WordPress side and then consume from Next.js.
- Subscription changes from WooCommerce can become the trigger for updating community access in the app.

### What I do **not** recommend first

I would not make the Next.js app the only auth owner first and then try to mirror users into WordPress later. That creates more moving parts:

- duplicate password/account lifecycle handling
- harder WooCommerce session continuity
- more brittle profile sync
- more work to keep billing and shipping details aligned

## Recommended Auth Model

### Identity flow

1. User signs in through WordPress auth.
2. WordPress exposes identity to Next.js through a secure token bridge or SSO flow.
3. Next.js creates or updates a local `users` record and app profile.
4. WooCommerce webhooks update subscription state in the Next.js database.
5. Middleware and server actions in Next.js use local entitlements to gate pages and media.

### Practical implementation options

Best practical path:

- WordPress site on `worldnew.love`
- Next.js community app on `community.worldnew.love`
- WordPress plugin or custom endpoint to issue JWT/session assertions
- Next.js verifies the assertion and creates its own app session
- WooCommerce webhooks call the Next.js backend on:
  - customer created or updated
  - order paid
  - subscription created
  - subscription renewed
  - subscription cancelled
  - refund or access revocation events

Current implementation in this repo:

- `POST /api/wordpress/sso` for signed WordPress-to-app login handoff
- `POST /api/wordpress/webhooks/woocommerce` for signed WooCommerce membership sync
- `GET /checkout/:planCode` for app-to-WordPress checkout redirect

### Social sign-in

Support these providers:

- Google
- Facebook

Implement them through the same identity owner as the main login flow. Since I recommend WordPress as the initial auth owner, that means social login should also terminate in WordPress first, then flow into Next.js.

## Roles and Access

Use app roles and subscription entitlements separately.

### Roles

- `super_admin`
- `artist_admin`
- `moderator`
- `member`

### Membership plans

- `day_pass`
- `monthly`
- `annual`

### Access levels for content

- `public`
- `community`
- `paid`
- `plan_specific`
- `custom_allowlist`

This separation matters because an admin may be a user with elevated privileges, while subscription status should independently control premium access.

## Media Strategy

Do not store large audio and video files directly on the VPS filesystem long-term if you want this to scale cleanly.

Recommended storage split:

- Audio and artwork: S3-compatible storage such as Cloudflare R2, Bunny, or AWS S3
- Video: Mux, Cloudflare Stream, Bunny Stream, or another streaming-oriented provider
- Metadata, permissions, categories, comments, feed events: PostgreSQL

### Upload workflow

1. Artist uploads media in the admin dashboard.
2. File is stored in object storage or a video service.
3. Next.js saves metadata and access rules in Postgres.
4. The app automatically creates a community feed item announcing the upload.
5. The feed item links back to the media detail page.

## Community Model

The community area should support:

- feed posts
- system posts for new uploads
- comments and threaded replies
- reactions
- tagging users in posts/comments
- following
- friendship requests and acceptance
- private conversations
- groups with group membership and group posts

Keep chat and feed data in the same Postgres database initially. That is simpler to ship and maintain on your VPS.

## Suggested Tech Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma or Drizzle for schema management
- Auth bridge from WordPress
- Object storage for media files
- Webhooks from WooCommerce into Next.js

Optional later:

- Redis for queues, notifications, and realtime scaling
- Pusher, Ably, or Socket.IO for live chat

## Hosting Recommendation

For the easiest updates on a Hostinger VPS:

- Run the Next.js app on the VPS
- Put it behind Nginx or Caddy
- Use PostgreSQL on the VPS or a managed Postgres service
- Use Git-based deploys from GitHub
- Use PM2 or Docker Compose for process management

My preference for easy maintenance:

- `community.worldnew.love` -> Next.js app on VPS
- `worldnew.love` -> existing WordPress site
- GitHub -> deploy to VPS via GitHub Actions or a simple pull-and-restart script

If you want the easiest future updates with less server babysitting, Docker Compose is the cleanest route.

## Data Ownership

Use this split:

- WordPress/WooCommerce owns:
  - checkout
  - orders
  - billing profile
  - subscription purchase events
  - customer identity in phase 1

- Next.js/Postgres owns:
  - app roles
  - dashboard data
  - media metadata
  - categories
  - entitlements cache
  - community posts
  - comments
  - reactions
  - follows
  - friendships
  - chats
  - groups
  - notifications

## Release Plan

### Phase 1

- Postgres schema
- WordPress identity bridge
- local app session
- registration, sign-in, profile sync
- membership sync from WooCommerce
- route protection

### Phase 2

- admin category management
- audio upload
- video upload
- media detail pages
- Netflix-style media browse page backed by DB data
- automatic community post when artist uploads

### Phase 3

- comments and reactions
- user tagging
- notifications
- follows and friendships

### Phase 4

- private chat
- group creation and membership
- group feeds

### Phase 5

- analytics
- moderation tools
- search
- refined UI polish across all surfaces

## Immediate Build Priorities

If we continue in this repo, the best order is:

1. Add database layer and schema migrations.
2. Add auth/session architecture.
3. Add role-aware layouts and route guards.
4. Replace hardcoded media/category data with database-backed models.
5. Add upload pipeline and feed event creation.
6. Add subscriptions and gated rendering.

## Notes About The Current Repo

The current codebase is still prototype-grade:

- admin uploads are only client state
- categories are only local state
- dashboard is hardcoded
- media browse is hardcoded
- there is no login
- there is no DB
- there is no content gating
- there is no WordPress sync

That is not a problem. It just means the right next move is to build the foundation cleanly rather than patching these screens in place one by one.
