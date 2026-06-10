import HomePageClient from "./HomePageClient";
import {
  getAnnouncements,
  getCurrentSeasonOverview,
  getLeaderboard,
  getMvpOfWeek,
  getSiteStats,
  getSponsors,
  getStreams,
  getTournaments,
  getVideos,
} from "@/lib/data";

export default async function HomePage() {
  const [stats, tournaments, leaderboard, mvp, announcements, streams, videos, sponsors, currentSeasonOverview] =
    await Promise.all([
      getSiteStats(),
      getTournaments(),
      getLeaderboard(),
      getMvpOfWeek(),
      getAnnouncements(),
      getStreams(),
      getVideos(),
      getSponsors(),
      getCurrentSeasonOverview(),
    ]);

  return (
    <HomePageClient
      initialStats={stats}
      initialTournaments={tournaments}
      initialLeaderboard={leaderboard}
      initialMvp={mvp}
      initialAnnouncements={announcements}
      initialStreams={streams}
      initialVideos={videos}
      initialSponsors={sponsors}
      initialOverview={currentSeasonOverview}
    />
  );
}
