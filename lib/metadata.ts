import type { Metadata } from "next";
import { getSiteUrl } from "./site";

type ContentMetadataInput = {
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
  type?: "website" | "article";
};

function resolveAbsoluteUrl(value: string) {
  return new URL(value, getSiteUrl()).toString();
}

export function buildContentMetadata({
  title,
  description,
  path,
  imageUrl,
  type = "article",
}: ContentMetadataInput): Metadata {
  const canonicalUrl = resolveAbsoluteUrl(path);
  const socialImage = resolveAbsoluteUrl(imageUrl || "/images/bravo-logo.png");

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type,
      url: canonicalUrl,
      title,
      description,
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
