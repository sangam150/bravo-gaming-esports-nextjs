import assert from "node:assert/strict";
import { buildSafeLiveStreamFeed, isExplicitlyPublishedContent, isPublicStreamSchedule } from "../lib/data";
import { selectHomepageEvents } from "../lib/homepage-events";
import {
  isManagedPlatformEventPublic,
  isManagedPlatformGamePublic,
  type ManagedPlatformEventRecord,
  type ManagedPlatformGameRecord,
} from "../lib/platform-cms";
import { buildEventTeamDamageTotals } from "../lib/pubg-hub";
import { getCanonicalPublicEventHref, normalizePublicActionHref } from "../lib/public-links";
import { selectPublicScrimDays, selectPublicScrims } from "../lib/public-scrims";
import { resolvePublicEventPolicy } from "../lib/public-event-policy";
import { HOMEPAGE_REVALIDATION_PATHS } from "../lib/revalidate-public";
import { sanitizePublicAssetUrl } from "../lib/public-content";
import { sanitizePublicMatch } from "../lib/public-match";
import {
  isSponsorSlugAlias,
  normalizeSponsorExternalUrl,
  resolveCanonicalSponsorSlug,
  resolveSponsorDestination,
  sponsorOpensInNewTab,
  SponsorLinkValidationError,
  validateSponsorDestinations,
} from "../lib/sponsor-links";
import type { Scrim, ScrimDayResult, TournamentMatch } from "../lib/types";

const NOW = Date.parse("2026-07-28T12:00:00.000Z");

function testPublicAssetProjection() {
  assert.equal(sanitizePublicAssetUrl("/images/brand/logo.svg"), "/images/brand/logo.svg");
  assert.equal(sanitizePublicAssetUrl("teams/team-id/logo.webp"), "/api/uploads/r2?key=teams%2Fteam-id%2Flogo.webp");
  assert.equal(sanitizePublicAssetUrl("https://assets.bravogamingesports.com/logo.png"), "https://assets.bravogamingesports.com/logo.png");
  assert.equal(sanitizePublicAssetUrl("https://attacker.invalid/image.png"), undefined);
  assert.equal(sanitizePublicAssetUrl("/api/uploads/private/evidence"), undefined);

  const privateAssetReferences = [
    "https://user:PRIVATE_GRANT@assets.bravogamingesports.com/image.png",
    "https://assets.bravogamingesports.com/image.png?X-Amz-Signature=PRIVATE_GRANT",
    "https://assets.bravogamingesports.com/image.png?token=PRIVATE_GRANT",
    "https://hldppfhtkfgthainismr.supabase.co/storage/v1/object/sign/private/image.png?token=PRIVATE_GRANT",
    "https://bravo-gaming-esports.vercel.app/api/uploads/private/PRIVATE_GRANT",
    "https://hldppfhtkfgthainismr.supabase.co/storage/v1/object/authenticated/private/PRIVATE_GRANT.png",
  ];
  for (const reference of privateAssetReferences) {
    assert.equal(sanitizePublicAssetUrl(reference), undefined);
    const result: TournamentMatch = {
      id: "verified-result", pubgMatchId: "verified-match", map: "Erangel", status: "published",
      winner: "Verified team", points: 0, knockouts: 0, dataSource: "manual_correction",
      resultScreenshotUrl: reference, scoreboardImageUrl: reference, resultImageUrl: reference,
      screenshotUrls: [reference, "/images/brand/logo.svg"],
    };
    const projected = sanitizePublicMatch(result);
    assert.doesNotMatch(JSON.stringify(projected), /PRIVATE_GRANT/, "The public match DTO itself must not expose a private image grant");
    assert.equal(projected.resultScreenshotUrl, undefined);
    assert.equal(projected.scoreboardImageUrl, undefined);
    assert.equal(projected.resultImageUrl, undefined);
    assert.deepEqual(projected.screenshotUrls, ["/images/brand/logo.svg"]);
  }
}

function testExplicitPublicationBoundary() {
  assert.equal(isExplicitlyPublishedContent({}), false);
  assert.equal(isExplicitlyPublishedContent({ published: false }), false);
  assert.equal(isExplicitlyPublishedContent({ published: true }), true);
  assert.equal(isExplicitlyPublishedContent({ published: true }, { requirePublishedAt: true, now: NOW }), false);
  assert.equal(isExplicitlyPublishedContent({ published: true, publishedAt: "not-a-date" }, { requirePublishedAt: true, now: NOW }), false);
  assert.equal(
    isExplicitlyPublishedContent({ published: true, publishedAt: "2026-07-28T11:59:59.000Z" }, { requirePublishedAt: true, now: NOW }),
    true,
  );
  assert.equal(
    isExplicitlyPublishedContent({ published: true, publishedAt: "2026-07-28T12:00:01.000Z" }, { requirePublishedAt: true, now: NOW }),
    false,
  );

  const publishedStream = {
    id: "published-stream",
    title: "Official Bravo broadcast",
    time: "2026-07-28T13:00:00.000Z",
    published: true,
    state: "published",
  };
  assert.equal(isPublicStreamSchedule(publishedStream, NOW), true);
  assert.equal(isPublicStreamSchedule({ ...publishedStream, published: undefined }, NOW), false);
  assert.equal(isPublicStreamSchedule({ ...publishedStream, state: "draft" }, NOW), false);
  assert.equal(isPublicStreamSchedule({ ...publishedStream, publishedAt: "invalid" }, NOW), false);
  assert.equal(isPublicStreamSchedule({ ...publishedStream, publishedAt: "2026-07-29T00:00:00.000Z" }, NOW), false);

  const safeChannelFeed = buildSafeLiveStreamFeed();
  assert.equal(safeChannelFeed.isLive, false);
  assert.equal(safeChannelFeed.time, "");
  assert.equal(safeChannelFeed.embedUrl, undefined);
  assert.equal(safeChannelFeed.viewers, undefined);

  const publishedGame: ManagedPlatformGameRecord = {
    id: "game",
    slug: "verified-game",
    name: "Verified Game",
    shortName: "VG",
    tagline: "Verified",
    summary: "Verified published game.",
    status: "active",
    flagship: false,
    heroLabel: "Game",
    primaryHref: "/games/verified-game",
    sections: [],
    completionLabel: "Available",
    published: true,
  };
  assert.equal(isManagedPlatformGamePublic(publishedGame), true);
  assert.equal(isManagedPlatformGamePublic({ ...publishedGame, published: false }), false);

  const publishedEvent: ManagedPlatformEventRecord = {
    id: "event",
    slug: "verified-event",
    name: "Verified Event",
    gameSlug: "verified-game",
    gameName: "Verified Game",
    type: "tournament",
    status: "upcoming",
    state: "published",
    featured: false,
    region: "Nepal",
    organizerName: "Bravo Gaming Esports",
    prizePool: "Not tracked",
    teamsCount: 0,
    matchesCount: 0,
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-02T00:00:00.000Z",
    summary: "Verified published event.",
    registrationOpen: false,
    tabs: [],
    published: true,
  };
  assert.equal(isManagedPlatformEventPublic(publishedEvent), true);
  assert.equal(isManagedPlatformEventPublic({ ...publishedEvent, published: false }), false);
  assert.equal(isManagedPlatformEventPublic({ ...publishedEvent, state: "planned" }), false);
  assert.equal(isManagedPlatformEventPublic({ ...publishedEvent, status: "planned" }), false);
  assert.equal(isManagedPlatformEventPublic({ ...publishedEvent, startDate: "invalid" }), false);
  assert.equal(isManagedPlatformEventPublic({ ...publishedEvent, endDate: "2026-07-31T00:00:00.000Z" }), false);
}

function testSponsorDestinations() {
  assert.equal(normalizeSponsorExternalUrl("https://hukut.com"), "https://hukut.com/");
  assert.equal(normalizeSponsorExternalUrl("http://hukut.com"), undefined);
  assert.equal(normalizeSponsorExternalUrl("javascript:alert(1)"), undefined);
  assert.equal(normalizeSponsorExternalUrl("https://user:password@hukut.com"), undefined);
  assert.equal(
    resolveSponsorDestination({
      websiteUrl: "https://hukut.com",
      campaignUrl: "https://campaign.example.com",
      socialUrl: "https://instagram.com/hukut",
    }),
    "https://hukut.com/",
  );
  assert.equal(
    resolveSponsorDestination({
      campaignUrl: "https://campaign.example.com",
      socialUrl: "https://instagram.com/hukut",
    }),
    "https://campaign.example.com/",
  );
  assert.equal(resolveSponsorDestination({ socialUrl: "https://instagram.com/hukut" }), "https://instagram.com/hukut");
  assert.equal(sponsorOpensInNewTab({}), false);
  assert.equal(sponsorOpensInNewTab({ openInNewTab: false }), false);
  assert.equal(sponsorOpensInNewTab({ websiteUrl: "https://hukut.com" }), true);
  assert.equal(sponsorOpensInNewTab({ openInNewTab: false, websiteUrl: "https://hukut.com" }), false);
  assert.equal(
    resolveSponsorDestination({
      websiteUrl: "https://hukut.com",
      campaignUrl: "https://campaign.example.com",
      homepageClickDestination: "campaign",
    }),
    "https://campaign.example.com/",
  );
  assert.equal(
    resolveSponsorDestination({
      websiteUrl: "https://hukut.com",
      homepageClickDestination: "none",
    }),
    undefined,
  );
  assert.throws(
    () => validateSponsorDestinations({ websiteUrl: "/sponsors/hukut" }),
    (error: unknown) => error instanceof SponsorLinkValidationError && error.field === "websiteUrl",
  );
  assert.equal(isSponsorSlugAlias("HUKUT-STORE"), true);
  assert.equal(resolveCanonicalSponsorSlug("hukut-store"), "hukut");
  assert.equal(normalizePublicActionHref("/events?tab=upcoming#list"), "/events?tab=upcoming#list");
  assert.equal(normalizePublicActionHref("#event-board"), "#event-board");
  assert.equal(normalizePublicActionHref("https://bravo.example/events"), "https://bravo.example/events");
  assert.equal(normalizePublicActionHref("//attacker.example/path"), undefined);
  assert.equal(normalizePublicActionHref("http://bravo.example/events"), undefined);
  assert.equal(normalizePublicActionHref("javascript:alert(1)"), undefined);
  assert.equal(getCanonicalPublicEventHref({ gameSlug: "pubg-pc", slug: "verified-event" }), "/pubg/events/verified-event");
  assert.equal(getCanonicalPublicEventHref({ gameSlug: "other-game", slug: "verified-event" }), "/events/verified-event");
  assert.equal(getCanonicalPublicEventHref({ gameSlug: "pubg-pc", slug: "" }), "/events");
}

function testEventPolicy() {
  const registration = resolvePublicEventPolicy(
    {
      status: "REGISTERING",
      published: true,
      startDate: "2026-08-01T12:00:00.000Z",
      endDate: "2026-08-03T12:00:00.000Z",
      registrationStatus: "open",
      registrationStartDate: "2026-07-20T00:00:00.000Z",
      registrationEndDate: "2026-07-31T23:59:59.000Z",
      registrationRequiresWindow: true,
    },
    NOW,
  );
  assert.equal(registration.lifecycle, "registration_open");
  assert.equal(registration.status, "upcoming");
  assert.equal(registration.registrationOpen, true);

  const underwayWithoutEnd = resolvePublicEventPolicy(
    {
      status: "LIVE",
      published: true,
      startDate: "2026-07-01T00:00:00.000Z",
      registrationOpen: true,
    },
    NOW,
  );
  assert.equal(underwayWithoutEnd.lifecycle, "ongoing");
  assert.equal(underwayWithoutEnd.status, "live");
  assert.equal(underwayWithoutEnd.registrationOpen, false);

  const staleUpcomingWithoutAuthoritativeStatus = resolvePublicEventPolicy(
    {
      status: "UPCOMING",
      published: true,
      startDate: "2026-07-01T00:00:00.000Z",
    },
    NOW,
  );
  assert.equal(staleUpcomingWithoutAuthoritativeStatus.lifecycle, "draft");
  assert.equal(staleUpcomingWithoutAuthoritativeStatus.status, "planned");

  assert.equal(resolvePublicEventPolicy({ status: "cancelled", published: true }, NOW).lifecycle, "cancelled");
  assert.equal(resolvePublicEventPolicy({ status: "archived", published: true }, NOW).lifecycle, "archived");
  assert.equal(resolvePublicEventPolicy({ status: "live", published: true, streamHref: "/live-stream" }, NOW).streamHref, null);
  assert.equal(
    resolvePublicEventPolicy({ status: "live", published: true, streamHref: "https://youtube.com/watch?v=verified" }, NOW).streamHref,
    "https://youtube.com/watch?v=verified",
  );
}

function testHomepageSelection() {
  const events = [
    {
      id: "first",
      slug: "first-event",
      status: "upcoming",
      state: "published",
      startDate: "2026-08-10T00:00:00.000Z",
      registrationOpen: false,
    },
    {
      id: "priority",
      slug: "priority-event",
      status: "upcoming",
      state: "published",
      startDate: "2026-08-20T00:00:00.000Z",
      registrationOpen: true,
    },
    {
      id: "complete",
      slug: "complete-event",
      status: "completed",
      state: "published",
      startDate: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "draft",
      slug: "draft-event",
      status: "planned",
      state: "planned",
      startDate: "2026-08-15T00:00:00.000Z",
    },
  ];
  const selected = selectHomepageEvents(
    events,
    [
      { eventSlug: "first-event", priority: 5, mode: "details", primary: false },
      {
        eventSlug: "priority-event",
        priority: 10,
        activeFrom: "2026-07-01T00:00:00.000Z",
        activeUntil: "2026-08-01T00:00:00.000Z",
        label: "Registration Feature",
        mode: "registration",
        primary: true,
      },
      { eventSlug: "complete-event", priority: 0, mode: "details", primary: true },
      { eventSlug: "draft-event", priority: 0, mode: "details", primary: true },
    ],
    { now: NOW, limit: 3 },
  );

  assert.deepEqual(
    selected.map((event) => event.id),
    ["priority", "first"],
  );
  assert.equal(selected[0]?.homepageFeature?.label, "Registration Feature");
}

function testDamageFallback() {
  const totals = buildEventTeamDamageTotals([
    { playerId: "m8-1", teamId: "M8", damage: 8_000 },
    { playerId: "m8-2", teamId: "M8", damage: 7_000 },
    { playerId: "m8-3", teamId: "M8", damage: 5_000 },
    { playerId: "m8-4", teamId: "M8", damage: 3_071 },
    { playerId: "m8-4", teamId: "M8", damage: 3_000 },
    { playerId: "haku-1", teamId: "Team HAKU", damage: 9_000 },
    { playerId: "haku-2", teamId: "Team HAKU", damage: 8_536 },
    { playerId: "n3p-1", teamId: "Near Edge Protocol (N3P)", damage: 7_000 },
    { playerId: "n3p-2", teamId: "Near Edge Protocol (N3P)", damage: 6_524 },
  ]);

  assert.equal(totals.get("M8"), 23_071);
  assert.equal(totals.get("Team HAKU"), 17_536);
  assert.equal(totals.get("Near Edge Protocol (N3P)"), 13_524);
}

function testPublicScrimsAndRevalidation() {
  const baseScrim: Scrim = {
    id: "public",
    title: "Bravo Scrim",
    date: "2026-08-01",
    map: "Erangel",
    lobbyTime: "20:00",
    teamIds: [],
    status: "scheduled",
    published: true,
  };
  const selected = selectPublicScrims([
    baseScrim,
    { ...baseScrim, id: "draft", published: false },
    { ...baseScrim, id: "deleted", deletedAt: "2026-07-28T00:00:00.000Z" },
    { ...baseScrim, id: "demo-seed", title: "Demo scrim" },
  ]);
  assert.deepEqual(
    selected.map((scrim) => scrim.id),
    ["public"],
  );
  const baseDay: ScrimDayResult = {
    id: "public-day",
    dayNumber: 1,
    label: "Day 1",
    date: "2026-08-01",
    displayDate: "August 1, 2026",
    status: "scheduled",
    scrimCount: 1,
    completedMatches: 0,
    pendingMatches: 0,
    matchIds: [],
    scrims: [baseScrim],
    matches: [],
    leaderboard: [],
    announcements: [],
  };
  assert.deepEqual(
    selectPublicScrimDays([
      baseDay,
      {
        ...baseDay,
        id: "private-day",
        scrims: [{ ...baseScrim, id: "private", published: false }],
      },
    ]).map((day) => day.id),
    ["scrim-day-2026-08-01"],
  );
  assert.deepEqual([...HOMEPAGE_REVALIDATION_PATHS], ["/", "/events", "/news", "/media", "/sponsors", "/pubg"]);
}

testSponsorDestinations();
testPublicAssetProjection();
testExplicitPublicationBoundary();
testEventPolicy();
testHomepageSelection();
testDamageFallback();
testPublicScrimsAndRevalidation();
console.log("Public consistency QA passed");
