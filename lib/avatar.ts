export const DEFAULT_AVATAR_STICKERS = [
  "/avatars/sticker-1.svg",
  "/avatars/sticker-2.svg",
  "/avatars/sticker-3.svg",
  "/avatars/sticker-4.svg",
  "/avatars/sticker-5.svg",
  "/avatars/sticker-6.svg",
];

export function normalizeOptionalUrl(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    if (hostname.endsWith("gravatar.com")) {
      return null;
    }
  } catch {
    // Ignore non-URL values and keep them as-is.
  }

  return trimmed;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveAvatarUrl(params: {
  avatarUrl?: string | null;
  userId?: string | null;
  email?: string | null;
  fallbackSeed?: string | null;
}) {
  const directAvatar = normalizeOptionalUrl(params.avatarUrl);
  if (directAvatar) {
    return directAvatar;
  }

  const seed =
    String(params.userId ?? "").trim() ||
    String(params.email ?? "").trim().toLowerCase() ||
    String(params.fallbackSeed ?? "").trim() ||
    "worldnew-member";

  const index = hashString(seed) % DEFAULT_AVATAR_STICKERS.length;
  return DEFAULT_AVATAR_STICKERS[index];
}
