import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamProfilePage({ params }: PageProps) {
  const { teamId } = await params;
  redirect(`/pubg/teams/${teamId}`);
}
