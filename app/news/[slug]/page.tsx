import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformNewsDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformArticleBySlug, getPlatformHubData } from "@/lib/platform-hub";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPlatformArticleBySlug(slug);

  if (!article) {
    return { title: "News Article Not Found" };
  }

  return buildContentMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.summary,
    path: `/news/${article.slug}`,
    imageUrl: article.imageUrl,
  });
}

export const revalidate = 300;

export default async function NewsDetailPage({ params }: PageProps) {
  const [{ slug }, hub] = await Promise.all([params, getPlatformHubData()]);
  const article = hub.news.find((item) => item.slug === slug) ?? null;

  if (!article) {
    notFound();
  }

  return <PlatformNewsDetailPage hub={hub} article={article} />;
}
