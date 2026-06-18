import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformOrganizationDetailPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData, getPlatformOrganizationBySlug } from "@/lib/platform-hub";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const organization = await getPlatformOrganizationBySlug(slug);

  if (!organization) {
    return { title: "Organization Not Found" };
  }

  return {
    title: organization.name,
    description: organization.summary,
  };
}

export const revalidate = 300;

export default async function OrganizationDetailPage({ params }: PageProps) {
  const [{ slug }, hub] = await Promise.all([params, getPlatformHubData()]);
  const organization = hub.organizations.find((item) => item.slug === slug) ?? null;

  if (!organization) {
    notFound();
  }

  return <PlatformOrganizationDetailPage hub={hub} organization={organization} />;
}
