import type { Announcement, SiteStats, SponsorItem, StreamSchedule, Tournament, VideoItem } from "./types";

export const seedStats: SiteStats = {
  teamsRegistered: 0,
  matchesHosted: 0,
  tournamentsCompleted: 0,
  prizePoolsAwarded: "Season updates soon",
  communityMembers: 0,
  youtubeViews: "Channel updates soon",
};

export const seedTournaments: Tournament[] = [];

export const seedAnnouncements: Announcement[] = [];

export const seedStreams: StreamSchedule[] = [];

export const seedVideos: VideoItem[] = [];

export const seedSponsors: SponsorItem[] = [];
