import { PlatformHomePage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";

export default async function HomePage() {
  const [hub, pubg] = await Promise.all([getPlatformHubData(), getPubgHubDataset()]);
  return <PlatformHomePage hub={hub} pubg={pubg} />;
}
