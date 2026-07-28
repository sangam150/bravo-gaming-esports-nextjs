import type { Metadata } from "next";
import { getSiteUrl } from "./site";

type ContentMetadataInput = {
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
};

function resolveAbsoluteUrl(value: string, fallbackPath = "/") {
  const siteUrl = getSiteUrl();

  try {
    const resolvedUrl = new URL(value, siteUrl);
    return resolvedUrl.protocol === "https:" || resolvedUrl.protocol === "http:"
      ? resolvedUrl.toString()
      : new URL(fallbackPath, siteUrl).toString();
  } catch {
    return new URL(fallbackPath, siteUrl).toString();
  }
}

function resolveBrandedTitle(title: string) {
  const normalizedTitle = title.trim();
  return normalizedTitle.toLowerCase().includes("bravo gaming esports") ? normalizedTitle : `${normalizedTitle} | Bravo Gaming Esports`;
}

export function buildContentMetadata({
  title,
  description,
  path,
  imageUrl,
  ogImageUrl,
  canonicalUrl,
  type = "website",
  publishedTime,
  modifiedTime,
}: ContentMetadataInput): Metadata {
  const brandedTitle = resolveBrandedTitle(title);
  const canonicalPath = canonicalUrl || path;
  const absoluteCanonicalUrl = resolveAbsoluteUrl(canonicalPath, path);
  const socialImage = resolveAbsoluteUrl(ogImageUrl || imageUrl || "/images/bravo-logo.png", "/images/bravo-logo.png");

  return {
    title: {
      absolute: brandedTitle,
    },
    description,
    alternates: {
      canonical: absoluteCanonicalUrl,
    },
    openGraph: {
      type,
      url: absoluteCanonicalUrl,
      title: brandedTitle,
      description,
      ...(type === "article"
        ? {
            publishedTime: publishedTime ?? undefined,
            modifiedTime: modifiedTime ?? undefined,
          }
        : {}),
      images: [
        {
          url: socialImage,
          alt: brandedTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: [socialImage],
    },
  };
}
