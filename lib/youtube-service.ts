import { getVideos, saveVideo } from "./data";
import { isDocumentStoreConfigured } from "./document-store";
import type { VideoItem } from "./types";

const DEFAULT_YOUTUBE_CHANNEL_ID = "UCiQ0gllz6KLTRs-6ma4Fhjw";
const DEFAULT_YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@bravogamingnepal7981";

type YouTubeThumbnailMap = Partial<
  Record<
    "default" | "medium" | "high" | "standard" | "maxres",
    {
      url: string;
      width?: number;
      height?: number;
    }
  >
>;

type YouTubePlaylistItem = {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: YouTubeThumbnailMap;
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
};

type YouTubeVideoDetail = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: YouTubeThumbnailMap;
  };
  contentDetails?: {
    duration?: string;
  };
};

type YouTubeApiResponse<T> = {
  items?: T[];
  nextPageToken?: string;
};

interface YouTubeSyncResult {
  channelId: string;
  channelUrl: string;
  scannedCount: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  items: VideoItem[];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function truncateDescription(value?: string | null, maxLength = 280) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Official Bravo Gaming YouTube upload. Review and publish from admin when ready.";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function resolveThumbnailUrl(thumbnails?: YouTubeThumbnailMap) {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    undefined
  );
}

function formatYouTubeDuration(value?: string | null) {
  if (!value) return "00:00";

  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return "00:00";

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function callYouTubeApi<T>(path: string, params: Record<string, string>) {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured.");
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.searchParams.set("key", apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`YouTube API request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

async function getUploadsPlaylistId(channelId: string) {
  const response = await callYouTubeApi<
    YouTubeApiResponse<{
      contentDetails?: {
        relatedPlaylists?: {
          uploads?: string;
        };
      };
    }>
  >("channels", {
    part: "contentDetails",
    id: channelId,
  });

  const playlistId = response.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) {
    throw new Error("Unable to resolve the YouTube uploads playlist for this channel.");
  }

  return playlistId;
}

function extractExistingYouTubeMatch(existingVideos: VideoItem[], videoId: string) {
  return (
    existingVideos.find((item) => item.youtubeVideoId === videoId) ??
    existingVideos.find((item) => item.id === `youtube-${videoId}`) ??
    existingVideos.find((item) => item.url?.includes(videoId))
  );
}

export async function syncYouTubeChannelDrafts(options?: { limit?: number; defaultGameSlug?: string }) {
  if (!isDocumentStoreConfigured()) {
    throw new Error("Supabase document storage is not configured for media sync yet.");
  }

  const limit = Math.max(1, Math.min(options?.limit ?? 24, 50));
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_YOUTUBE_CHANNEL_ID;
  const channelUrl = process.env.YOUTUBE_CHANNEL_URL?.trim() || DEFAULT_YOUTUBE_CHANNEL_URL;
  const uploadsPlaylistId = await getUploadsPlaylistId(channelId);

  const playlistItems: YouTubePlaylistItem[] = [];
  let nextPageToken = "";

  while (playlistItems.length < limit) {
    const response = await callYouTubeApi<YouTubeApiResponse<YouTubePlaylistItem>>("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(50, limit - playlistItems.length)),
      pageToken: nextPageToken,
    });

    playlistItems.push(...(response.items ?? []));
    if (!response.nextPageToken) {
      break;
    }

    nextPageToken = response.nextPageToken;
  }

  const videoIds = Array.from(
    new Set(playlistItems.map((item) => item.contentDetails?.videoId?.trim()).filter((value): value is string => Boolean(value))),
  );

  if (videoIds.length === 0) {
    return {
      channelId,
      channelUrl,
      scannedCount: 0,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      items: [],
    } satisfies YouTubeSyncResult;
  }

  const detailResponse = await callYouTubeApi<YouTubeApiResponse<YouTubeVideoDetail>>("videos", {
    part: "snippet,contentDetails",
    id: videoIds.join(","),
    maxResults: String(videoIds.length),
  });

  const detailsById = new Map((detailResponse.items ?? []).map((item) => [item.id ?? "", item] as const).filter(([id]) => Boolean(id)));

  const existingVideos = await getVideos({ includeUnpublished: true });
  const savedItems: VideoItem[] = [];
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const videoId of videoIds) {
    const details = detailsById.get(videoId);
    const snippet = details?.snippet;
    const title = snippet?.title?.trim();

    if (!title || /^deleted video$/i.test(title) || /^private video$/i.test(title)) {
      skippedCount += 1;
      continue;
    }

    const existingVideo = extractExistingYouTubeMatch(existingVideos, videoId);
    const canonicalId = existingVideo?.id ?? `youtube-${videoId}`;
    const publishedAt =
      snippet?.publishedAt ??
      playlistItems.find((item) => item.contentDetails?.videoId === videoId)?.contentDetails?.videoPublishedAt ??
      new Date().toISOString();

    const payload: Partial<VideoItem> & { title: string } = {
      title,
      slug: existingVideo?.slug ?? `youtube-${slugify(title)}`,
      category: existingVideo?.category ?? "YouTube",
      kind: existingVideo?.kind ?? "YouTube Video",
      duration: formatYouTubeDuration(details?.contentDetails?.duration),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      gameSlug: existingVideo?.gameSlug ?? options?.defaultGameSlug ?? "pubg-pc",
      summary: truncateDescription(snippet?.description),
      imageUrl: resolveThumbnailUrl(snippet?.thumbnails),
      featured: existingVideo?.featured ?? false,
      published: existingVideo?.published ?? false,
      source: "youtube_sync",
      youtubeVideoId: videoId,
      publishedAt,
    };

    const savedItem = await saveVideo(payload, canonicalId);
    savedItems.push(savedItem);

    if (existingVideo) {
      updatedCount += 1;
    } else {
      importedCount += 1;
    }
  }

  return {
    channelId,
    channelUrl,
    scannedCount: videoIds.length,
    importedCount,
    updatedCount,
    skippedCount,
    items: savedItems,
  } satisfies YouTubeSyncResult;
}
