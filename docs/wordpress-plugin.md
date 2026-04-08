# WordPress Plugin Setup

The WordPress half of the bridge lives in:

- `wordpress-plugin/worldnew-community-bridge/`

## Install

1. Copy that folder to your WordPress install under `wp-content/plugins/`
2. Activate `World New Community Bridge`
3. Open `Settings -> World New Bridge`
4. Set:
   - `Community app base URL`
   - `Internal app base URL (optional)`
   - `Shared secret`
   - `SSO path`
   - `Webhook path`
   - `Credential auth API path`
   - WooCommerce product IDs for day pass, monthly, and annual

## Recommended values

- Community app base URL:
  - `https://community.worldnew.love`
- Internal app base URL:
  - Leave blank in production unless WordPress needs a private network route to the app
  - For local Docker use `http://app:3000`
- SSO path:
  - `/api/wordpress/sso`
- Webhook path:
  - `/api/wordpress/webhooks/woocommerce`
- Credential auth API path:
  - `/wp-json/worldnew/v1/auth/login`

## Browser SSO flow

When a signed-in WordPress user clicks the community button, the plugin:

1. Builds a signed payload with the user identity
2. Redirects the browser to the Next.js app SSO endpoint
3. Lets the app create its own session cookie
4. Redirects the user to the dashboard

## Direct credential flow

When a user submits their WordPress email and password on the community app:

1. The app posts the credentials to the plugin login endpoint
2. WordPress validates the password
3. WordPress returns a one-time handoff URL
4. The browser is sent to WordPress to establish the WordPress session cookie
5. WordPress redirects back into the app SSO endpoint
6. The app creates its own session cookie

## WooCommerce sync flow

When mapped products are purchased or subscriptions change, the plugin sends signed JSON to the app so the app can:

- create or update the linked user
- activate the right membership plan
- keep gated media access aligned

## Shortcode

Place this on any page:

```text
[worldnew_community_button]
```

It renders a sign-in button for logged-in WordPress users.

## Architecture note

The Next.js app should not read the WordPress database directly. The cleaner integration is:

- Next.js asks WordPress to validate credentials
- WordPress creates the WordPress session in the browser
- WordPress sends a signed identity payload to Next.js
- WooCommerce changes are pushed to Next.js with signed webhooks

Direct DB access would tightly couple the app to WordPress internals and still would not create valid WordPress browser cookies.
