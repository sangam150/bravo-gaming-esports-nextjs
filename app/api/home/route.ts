import {
  getAnnouncements,
  getCurrentSeasonOverview,
  getLeaderboard,
  getMvpOfWeek,
  getStreams,
  getTournaments,
  getVideos,
  getSiteStats,
} from "@/lib/data";

export async function GET() {
  const [stats, tournaments, leaderboard, mvp, announcements, streams, videos, currentSeason] = await Promise.all([
    getSiteStats(),
    getTournaments(),
    getLeaderboard(),
    getMvpOfWeek(),
    getAnnouncements(),
    getStreams(),
    getVideos(),
    getCurrentSeasonOverview(),
  ]);

  return Response.json({
    success: true,
    data: { stats, tournaments, leaderboard, mvp, announcements, streams, videos, currentSeason },
  });
}
