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

export async function GET() {
  const [stats, tournaments, leaderboard, mvp, announcements, streams, videos, sponsors, currentSeason] = await Promise.all([
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

  return Response.json({
    success: true,
    data: {
      stats,
      tournaments,
      leaderboard,
      mvp,
      announcements,
      streams,
      videos,
      sponsors,
      currentSeason,
    },
  });
}
