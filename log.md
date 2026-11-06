# Implementation Work Log

## Request Summary

Implemented the requested global-cover, feed, description, album ZIP, media-heading, poster orientation, and album tracklist updates.

## Findings and Assumptions

- The global cover was submitted through a Next.js Server Action. To avoid the deployment-specific 404, both admin cover forms now submit to a conventional authenticated API route. Uploaded covers are stored under `/public/uploads/profiles`, which is persisted by the Docker named volume.
- The artist dashboard redirects away from the member dashboard, so placing the post composer only on the member dashboard left the artist without a usable publishing control. The composer and comment controls are now available on the admin dashboard; member comments remain available on the member feed.
- WordPress product descriptions can contain HTML. The community album UI now turns paragraph/block boundaries into separate readable paragraphs, strips markup, and preserves link text and its destination as readable text rather than exposing tags.
- Album tracks sourced from linked WooCommerce products use those products' descriptions. Community-created ZIPs are written to the app's public uploads path, and the WordPress album tab accepts a ZIP upload whose WordPress uploads URL becomes the product download URL.
- The music sidebar heading is stored in the existing `app_settings` table and defaults to “Top Songs” until changed; its editor is on Music Store, alongside audio catalog management.
- Absolute download URLs for community-uploaded ZIPs prefer `NEXT_PUBLIC_APP_URL` (or `APP_URL`) and use forwarded request host/protocol headers as a production fallback when those values still point to localhost. Production should still set the canonical public app origin explicitly.

## Changes Made

- Added a stable authenticated API endpoint for global cover uploads and routed both admin dashboard and profile-page forms through it.
- Added artist post/comment controls to the admin feed view and retained member commenting on the member feed.
- Added a shared HTML-description formatter for album summaries, details, and track rows; extended WordPress album-track payloads to include linked track descriptions.
- Album ZIP uploads now travel as 768 KiB authenticated chunks and are assembled on the server, avoiding a total-file request cap in either app. Both paths validate the `.zip` extension and ZIP signature. Storage quotas and disk capacity remain hosting constraints, not application-defined size limits.
- Made the community album source selector mutually exclusive in the editor: ZIP mode exposes ZIP fields, while existing-track mode exposes only the ordered product-track selector.
- Added an admin setting for the Netflix/media-page music sidebar heading.
- Made video cards use a portrait 2:3 or landscape 16:9 frame based on the selected poster, with contain-fit rendering so portrait artwork is not cropped.
- Restyled album track rows with album artwork thumbnails while retaining the per-track cart and playback controls.
- Changed desktop hover expansion to a fixed overlay that preserves the grid slot and clamps the expanded card within the viewport.
- Added a per-service Lovebox heading for the dynamic occasions section; it defaults to “Reasons to get a video” and is configurable in the Lovebox product tab.

## Verification

- `npm run lint`: passed with existing `<img>` performance warnings.
- `npx tsc --noEmit`: passed.
- `php -l wordpress-plugin/worldnew-community-bridge/worldnew-community-bridge.php`: passed.
- `git diff --check`: passed.
- `npm run build`: attempted; blocked because `fonts.googleapis.com` could not resolve in the restricted environment. A network-enabled retry was declined, so optimized production build verification remains outstanding.

This file is an implementation/verification log, not a private reasoning transcript.
