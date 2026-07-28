import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveHomepageEventAction, selectHomepageEvents } from "../lib/homepage-events";
import { formatNepalDateTimeInput, nepalDateTimeLocalToUtcIso } from "../lib/nepal-datetime";

const NOW = Date.parse("2026-07-28T12:00:00.000Z");

async function main() {
  assert.equal(nepalDateTimeLocalToUtcIso("2026-07-28T18:30"), "2026-07-28T12:45:00.000Z");
  assert.equal(formatNepalDateTimeInput("2026-07-28T12:45:00.000Z"), "2026-07-28T18:30");
  assert.equal(nepalDateTimeLocalToUtcIso("not-a-date"), undefined);

  const upcomingEvent = {
    id: "event-id",
    slug: "event-slug",
    status: "upcoming",
    state: "published",
    startDate: "2026-08-05T12:00:00.000Z",
    registrationOpen: false,
  };
  assert.deepEqual(
    resolveHomepageEventAction(
      upcomingEvent,
      {
        priority: 0,
        mode: "registration",
        primary: true,
        ctaHref: "https://example.com/unverified-registration",
        ctaLabel: "Register elsewhere",
      },
      { now: NOW },
    ),
    {
      href: "/events/event-slug",
      kind: "details",
      label: "View Details",
      fallbackReason: "registration_closed",
    },
  );

  assert.equal(
    resolveHomepageEventAction(
      { ...upcomingEvent, registrationOpen: true },
      { priority: 0, mode: "registration", primary: true, ctaHref: "https://example.com/override" },
      { now: NOW },
    ).href,
    "/teams/register?tournament=event-id",
  );

  assert.equal(
    resolveHomepageEventAction(
      {
        ...upcomingEvent,
        status: "live",
        startDate: "2026-07-28T10:00:00.000Z",
        streamHref: "https://youtube.com/watch?v=verified",
      },
      { priority: 0, mode: "stream", primary: true, ctaHref: "https://example.com/unverified" },
      { now: NOW },
    ).href,
    "https://youtube.com/watch?v=verified",
  );

  assert.equal(
    resolveHomepageEventAction(
      { ...upcomingEvent, status: "live", startDate: "2026-07-28T10:00:00.000Z" },
      { priority: 0, mode: "stream", primary: true, ctaHref: "https://example.com/unverified" },
      { now: NOW },
    ).fallbackReason,
    "stream_unavailable",
  );

  assert.deepEqual(
    selectHomepageEvents(
      [
        upcomingEvent,
        {
          ...upcomingEvent,
          id: "cancelled-id",
          slug: "cancelled",
          status: "cancelled",
        },
        {
          ...upcomingEvent,
          id: "archived-id",
          slug: "archived",
          status: "archived",
        },
      ],
      [
        { eventSlug: "event-slug", priority: 1, mode: "details", primary: true },
        { eventSlug: "cancelled", priority: 0, mode: "details", primary: false },
        { eventSlug: "archived", priority: 0, mode: "details", primary: false },
      ],
      { now: NOW },
    ).map((event) => event.id),
    ["event-id"],
  );

  const [sidebarSource, requestsSource, dashboardSource, catalogSource, cmsSource] = await Promise.all([
    readFile(new URL("../components/admin/AdminSidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/AdminTeamRequestsManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/AdminDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/PlatformCatalogManagers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/platform-cms.ts", import.meta.url), "utf8"),
  ]);

  assert.match(sidebarSource, /playerTeamLinking".*platformAdminOnly: true/);
  assert.match(requestsSource, /readOnly = false/);
  assert.match(requestsSource, /request\.status === "pending" \|\| request\.status === "review_later"/);
  assert.match(requestsSource, /submission\.status === "submitted"/);
  assert.match(dashboardSource, /fetchApiData<Season\[\]>/);
  assert.match(dashboardSource, /Some admin resources are temporarily unavailable/);
  assert.doesNotMatch(dashboardSource, /aria-label="Captain (Name|Discord|Phone|Email)"/);
  assert.doesNotMatch(dashboardSource, /aria-label="Team registration status"/);
  assert.match(catalogSource, /option value="cancelled"/);
  assert.match(catalogSource, /option value="archived"/);
  assert.match(cmsSource, /"cancelled",\s+"archived"/);

  console.log("Admin role gating, terminal requests, homepage CTA policy, Nepal datetime, event status, and bootstrap QA passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
