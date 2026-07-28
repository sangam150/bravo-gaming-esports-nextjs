import JsonLd from "@/components/JsonLd";
import { NewsArticlePage } from "@/components/news/NewsPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformArticleBySlug, getPlatformHubData } from "@/lib/platform-hub";
import { buildArticleStructuredData, buildBreadcrumbStructuredData } from "@/lib/structured-data";
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
    title: article.seoTitle?.trim() || article.title,
    description:
      article.seoDescription?.trim() ||
      article.excerpt?.trim() ||
      article.summary.trim() ||
      `Read the published Bravo Gaming Esports update: ${article.title}.`,
    path: `/news/${article.slug}`,
    imageUrl: article.imageUrl,
    ogImageUrl: article.ogImageUrl,
    canonicalUrl: article.canonicalUrl,
    type: "article",
    publishedTime: article.publishedAt ?? article.date,
    modifiedTime: article.updatedAt ?? article.publishedAt ?? article.date,
  });
}

export const revalidate = 60;

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getPlatformArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const hub = await getPlatformHubData();
  const articlePath = `/news/${article.slug}`;

  return (
    <>
      <JsonLd
        data={buildArticleStructuredData({
          authorName: article.authorName,
          canonicalUrl: article.canonicalUrl,
          category: article.category,
          description: article.excerpt?.trim() || article.summary,
          imageUrl: article.ogImageUrl || article.imageUrl,
          modifiedAt: article.updatedAt ?? article.publishedAt ?? article.date,
          path: articlePath,
          publishedAt: article.publishedAt ?? article.date,
          tags: article.tags,
          title: article.title,
        })}
      />
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "News", path: "/news" },
          { name: article.title, path: article.canonicalUrl || articlePath },
        ])}
      />
      <NewsArticlePage hub={hub} article={article} />
    </>
  );
}
