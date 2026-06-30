import { redirect } from "next/navigation";

type NewsMediaPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

export default async function NewsMediaPage({ searchParams }: NewsMediaPageProps) {
  const { tab } = await searchParams;

  redirect(tab?.trim().toLowerCase() === "videos" ? "/media" : "/news");
}
