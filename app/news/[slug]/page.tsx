import { NewsArticlePage } from "@/components/news/NewsPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformArticleBySlug, getPlatformHubData, type PlatformArticle } from "@/lib/platform-hub";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPlatformArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return buildContentMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt ?? article.summary,
    path: `/news/${article.slug}`,
    imageUrl: article.imageUrl,
    ogImageUrl: article.ogImageUrl,
    canonicalUrl: article.canonicalUrl,
    publishedTime: article.publishedAt ?? article.date,
    modifiedTime: article.updatedAt ?? article.publishedAt ?? article.date,
  });
}

export const revalidate = 60;

function buildAbsoluteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, getSiteUrl()).toString();
}

function buildCanonicalUrl(article: PlatformArticle) {
  return buildAbsoluteUrl(article.canonicalUrl || `/news/${article.slug}`);
}

function resolveStructuredDataDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return undefined;
  }

  return parsedValue.toISOString();
}

function buildStructuredData(article: PlatformArticle) {
  const canonicalUrl = buildCanonicalUrl(article);
  const socialImageUrl = buildAbsoluteUrl(article.ogImageUrl || article.imageUrl || "/images/bravo-logo.png");
  const publishedTime = resolveStructuredDataDate(article.publishedAt ?? article.date);
  const modifiedTime = resolveStructuredDataDate(article.updatedAt ?? article.publishedAt ?? article.date);

  return {
    article: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt ?? article.summary,
      image: [socialImageUrl],
      datePublished: publishedTime,
      dateModified: modifiedTime,
      mainEntityOfPage: canonicalUrl,
      articleSection: article.category,
      keywords: article.tags,
      author: {
        "@type": "Person",
        name: article.authorName,
      },
      publisher: {
        "@type": "Organization",
        name: "Bravo Gaming Esports",
        url: getSiteUrl(),
        logo: {
          "@type": "ImageObject",
          url: buildAbsoluteUrl("/images/bravo-logo.png"),
        },
      },
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: buildAbsoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "News",
          item: buildAbsoluteUrl("/news"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: canonicalUrl,
        },
      ],
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getPlatformArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const hub = await getPlatformHubData();
  const structuredData = buildStructuredData(article);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.article),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.breadcrumb),
        }}
      />
      <NewsArticlePage hub={hub} article={article} />
    </>
  );
}
