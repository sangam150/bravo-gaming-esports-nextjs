import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/pubg/matches/${id}`);
}
