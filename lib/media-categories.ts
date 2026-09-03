import type { MediaCard } from "@/lib/data";

export const MEDIA_CATEGORIES = [
  { slug: "movies", label: "Movies" },
  { slug: "music", label: "Music" },
  { slug: "videos", label: "Videos" },
  { slug: "mixtapes", label: "Mixtapes" },
  { slug: "reels", label: "Reels" },
  { slug: "behind-the-scenes", label: "Behind the Scenes" },
] as const;

export function categoryLabelForSlug(slug: string) {
  return MEDIA_CATEGORIES.find((category) => category.slug === slug)?.label ?? slug.replaceAll("-", " ");
}

export function categoryHrefForSlug(slug: string) {
  if (slug === "music") {
    return "/media/audio";
  }

  return `/media/category/${slug}`;
}

export function mediaForCategory(media: MediaCard[], slug: string) {
  const normalizedSlug = slug === "mixtabes" ? "mixtapes" : slug;
  const directMatches = media.filter((item) => item.categorySlug === normalizedSlug);

  if (directMatches.length > 0) {
    return directMatches;
  }

  if (normalizedSlug === "music") {
    return media.filter((item) => item.mediaType === "audio");
  }

  return directMatches;
}
