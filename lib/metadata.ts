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

function resolveAbsoluteUrl(value: string) {
  return new URL(value, getSiteUrl()).toString();
}

export function buildContentMetadata({
  title,
  description,
  path,
  imageUrl,
  ogImageUrl,
  canonicalUrl,
  type = "article",
  publishedTime,
  modifiedTime,
}: ContentMetadataInput): Metadata {
  const canonicalPath = canonicalUrl || path;
  const absoluteCanonicalUrl = resolveAbsoluteUrl(canonicalPath);
  const socialImage = resolveAbsoluteUrl(ogImageUrl || imageUrl || "/images/bravo-logo.png");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type,
      url: absoluteCanonicalUrl,
      title,
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
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}
