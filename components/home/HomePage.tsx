import ReferenceHomePage from "@/components/home/ReferenceHomePage";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";

export default async function HomePage() {
  const [hub, pubg] = await Promise.all([getPlatformHubData(), getPubgHubDataset()]);
  return <ReferenceHomePage hub={hub} pubg={pubg} />;
}
