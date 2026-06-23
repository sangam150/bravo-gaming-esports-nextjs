import HomeDashboard from "@/components/home/HomeDashboard";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";

export default async function HomePage() {
  const [hub, pubg] = await Promise.all([getPlatformHubData(), getPubgHubDataset()]);
  return <HomeDashboard hub={hub} pubg={pubg} />;
}
