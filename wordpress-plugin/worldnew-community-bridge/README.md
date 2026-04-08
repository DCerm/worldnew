# World New Community Bridge

This plugin connects your WordPress + WooCommerce site to the Next.js community app.

## What it does

- Adds a WordPress settings page for the app URL and shared secret
- Exposes `wp-json/worldnew/v1/auth/login` for direct community-app credential login
- Creates signed browser redirects from WordPress into the Next.js app
- Sends signed WooCommerce order/subscription events to the app
- Provides a shortcode: `[worldnew_community_button]`
- Adds a "World New Community" link to the WordPress admin bar for signed-in users

## Install

1. Copy the `worldnew-community-bridge` folder into `wp-content/plugins/`
2. Activate the plugin in WordPress
3. Go to `Settings -> World New Bridge`
4. Fill in:
   - community app base URL
   - internal app base URL if WordPress needs a private network address for server-to-server calls
   - shared secret
   - SSO path
   - webhook path
   - product ID mappings

## Required matching app config

The Next.js app must use the same `WORDPRESS_SSO_SECRET` value.

The default endpoints expected by this plugin are:

- `/wp-json/worldnew/v1/auth/login`
- `/api/wordpress/sso`
- `/api/wordpress/webhooks/woocommerce`

## Product mapping

Use comma-separated WooCommerce product IDs or variation IDs for:

- Day Pass
- Monthly
- Annual

Those mappings decide which plan code gets sent to the app.

## Direct login flow

Users can type their WordPress email and password directly on the community app login page.

The flow is:

1. Next.js sends the credentials to `wp-json/worldnew/v1/auth/login`
2. WordPress validates them
3. WordPress returns a one-time handoff URL
4. The browser is redirected to WordPress
5. WordPress sets its own auth cookie
6. WordPress redirects back to the Next.js SSO endpoint
7. Next.js creates its own session cookie

## Docker note

For local Docker, a good split is:

- `Community app base URL`: `http://localhost:3000`
- `Internal app base URL`: `http://app:3000`

That lets browser redirects use `localhost` while WordPress webhooks and SSO callbacks can still reach the app over the Docker network.
