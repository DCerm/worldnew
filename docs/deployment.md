# World New Deployment Guide

## Overview

This repo can be deployed in two practical ways on your Hostinger VPS:

1. Docker Compose
2. Direct Node.js process with PM2

If you want the easiest repeatable updates, use Docker Compose.

## Prerequisites

On the VPS, install:

- Git
- Docker and Docker Compose plugin

Optional for non-Docker deploys:

- Node.js 20
- npm
- PM2

Recommended DNS setup:

- `worldnew.love` stays on WordPress
- `community.worldnew.love` points to the VPS running this Next.js app

## Local Docker Testing

### 1. Prepare env file

Copy the example file:

```bash
cp .env.docker.example .env.docker
```

### 2. Start the app and Postgres

```bash
docker compose up --build
```

The app will be available at:

- `http://localhost:3000`

WordPress should already be running separately (for example LocalWP) at:
- `http://localhost:10019`

Postgres will be available at:

- `localhost:5432`

with:

- database: `worldnew`
- user: `worldnew`
- password: `worldnew`

On first boot, the Postgres schema is loaded automatically from `db/worldnew_schema.sql`.

### 3. Stop services

```bash
docker compose down
```

### 4. Reset everything including database volume

```bash
docker compose down -v
```

To confirm the tables exist:

```bash
docker compose exec postgres psql -U worldnew -d worldnew -c "\\dt"
```

Seed the demo data:

```bash
DATABASE_URL=postgresql://worldnew:worldnew@localhost:5432/worldnew npm run seed
```

Demo accounts:

- artist: `artist@worldnew.love` / `artist1234`
- member: `member@worldnew.love` / `member1234`

### WordPress plugin settings for local Docker + LocalWP

- `Community app base URL`: `http://localhost:3000`
- `Internal app base URL (optional)`: leave blank for LocalWP unless your WP runtime cannot reach localhost
- `Shared secret`: same value as `WORDPRESS_SSO_SECRET`
- `SSO path`: `/api/wordpress/sso`
- `Webhook path`: `/api/wordpress/webhooks/woocommerce`
- `Credential auth API path`: `/wp-json/worldnew/v1/auth/login`

### Why `WORDPRESS_AUTH_API_URL` uses `host.docker.internal`

The Next.js app calls WordPress from inside the container. From there:
- `localhost` means the container itself (not your Mac host)
- `host.docker.internal` points back to your host machine

Use:
- `WORDPRESS_AUTH_API_URL=http://host.docker.internal:10019/wp-json/worldnew/v1/auth/login`

Keep browser-facing URLs as `http://localhost:10019` for login and checkout links.

## WordPress Integration Endpoints

This app now exposes:

- `POST /api/wordpress/sso`
- `POST /api/wordpress/webhooks/woocommerce`
- `GET /checkout/:planCode`

The WordPress plugin exposes:

- `POST /wp-json/worldnew/v1/auth/login`

### Signature rule

The SSO and webhook endpoints expect the raw JSON body to be signed with `WORDPRESS_SSO_SECRET`.

Accepted headers:

- `x-worldnew-signature`
- `x_wordnew_signature`
- `x-wc-webhook-signature`

Accepted formats:

- hex HMAC-SHA256
- base64 HMAC-SHA256

### SSO payload example

```json
{
  "email": "member@example.com",
  "wordpress_user_id": 123,
  "wordpress_customer_id": 456,
  "display_name": "Member Name",
  "first_name": "Member",
  "last_name": "Name",
  "avatar_url": "https://example.com/avatar.jpg",
  "cover_image_url": "https://example.com/cover.jpg",
  "bio": "Optional bio",
  "roles": ["member"],
  "return_to": "/dashboard"
}
```

### WooCommerce webhook payload example

```json
{
  "event": "subscription.updated",
  "order_id": 1001,
  "subscription_id": 555,
  "user": {
    "email": "member@example.com",
    "wordpress_user_id": 123,
    "wordpress_customer_id": 456,
    "display_name": "Member Name"
  },
  "membership": {
    "plan_code": "monthly",
    "status": "active",
    "starts_at": "2026-04-07T00:00:00Z",
    "ends_at": "2026-05-07T00:00:00Z",
    "auto_renews": true,
    "amount": 9.99,
    "currency": "USD"
  }
}
```

### Checkout handoff

When a signed-in app user opens `/checkout/monthly?returnTo=/dashboard`, the app redirects them to WordPress checkout with the mapped WooCommerce product plus:

- `app_email`
- `app_user_id`
- `return_to`

## Direct Login Behavior

The community app login page now checks WordPress credentials first by calling:

- `WORDPRESS_AUTH_API_URL`

If WordPress validates the password, the browser is redirected through a WordPress handoff URL so:

1. WordPress sets its own auth cookie
2. the app SSO endpoint sets the app cookie

The app does not need direct database access to WordPress for this flow. It only needs:

- a credential-validation endpoint on WordPress
- a signed SSO redirect from WordPress to the app
- signed webhook pushes for membership state changes

## Docker Deployment on Hostinger VPS

### 1. Clone the repo on the server

```bash
git clone <your-repo-url> worldnew
cd worldnew
```

### 2. Create the runtime env file

```bash
cp .env.docker.example .env.docker
```

Then edit `.env.docker` with real values.

At minimum, set:

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=postgresql://worldnew:<strong-password>@postgres:5432/worldnew`
- `WORDPRESS_BASE_URL=https://worldnew.love`
- `WORDPRESS_LOGIN_URL=https://worldnew.love/my-account/`
- `WORDPRESS_CHECKOUT_URL=https://worldnew.love/checkout/`
- `WORDPRESS_AUTH_API_URL=https://worldnew.love/wp-json/worldnew/v1/auth/login`
- `WORDPRESS_SSO_SECRET=<shared-secret>`
- `NEXT_PUBLIC_APP_URL=https://community.worldnew.love`

Optional fallback WooCommerce product IDs if you do not want to store them in the DB:

- `WORDPRESS_PRODUCT_DAY_PASS=<product-id>`
- `WORDPRESS_PRODUCT_MONTHLY=<product-id>`
- `WORDPRESS_PRODUCT_ANNUAL=<product-id>`

### 3. Start in detached mode

```bash
docker compose up -d --build
```

### 5. Seed the app data

```bash
DATABASE_URL=postgresql://worldnew:worldnew@127.0.0.1:5432/worldnew npm run seed
```

### 6. Verify the app is up

```bash
docker compose ps
```

### 7. Put Nginx or Caddy in front

Use a reverse proxy to terminate SSL and forward traffic to port `3000`.

Example Nginx upstream target:

- `http://127.0.0.1:3000`

## Updating the VPS Deployment

From inside the repo on the server:

```bash
git pull
docker compose up -d --build
```

If the database schema changes:

```bash
docker compose -f docker-compose.yml exec -T postgres psql -U worldnew -d worldnew < db/worldnew_schema.sql
```

If you want the demo content refreshed:

```bash
DATABASE_URL=postgresql://worldnew:worldnew@127.0.0.1:5432/worldnew npm run seed
```

Later, once we add Prisma or Drizzle, replace that manual SQL load with migrations.

## Optional Non-Docker Deployment with PM2

### 1. Install Node.js 20 and PM2

```bash
npm install -g pm2
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Build the app

```bash
npm run build
```

### 4. Start the app

```bash
pm2 start npm --name worldnew -- start
```

### 5. Save the PM2 process list

```bash
pm2 save
```

### 6. Update later

```bash
git pull
npm ci
npm run build
pm2 restart worldnew
```

## Recommended Production Layout

For simplicity, I recommend:

- Docker Compose for the Next.js app
- PostgreSQL in Docker initially
- Nginx on the VPS as reverse proxy
- WordPress remains on Hostinger WordPress hosting

## What Comes Next

This Docker setup is enough to:

- run the current app locally
- run Postgres locally
- seed working demo users and content
- deploy the current app to a VPS
