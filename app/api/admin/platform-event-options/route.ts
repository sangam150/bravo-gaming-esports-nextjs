import { requireAdmin } from "@/lib/admin-auth";
import { getManagedPlatformEvents } from "@/lib/platform-cms";
import { getPlatformHubData } from "@/lib/platform-hub";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const [hub, managedPlatformEvents] = await Promise.all([getPlatformHubData(), getManagedPlatformEvents({ includeUnpublished: true })]);
  const eventMap = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      gameName: string;
      status: string;
      state?: string;
    }
  >();

  for (const event of hub.events) {
    eventMap.set(event.slug, {
      id: event.id,
      slug: event.slug,
      name: event.name,
      gameName: event.gameName,
      status: event.status,
      state: event.state,
    });
  }

  for (const event of managedPlatformEvents) {
    eventMap.set(event.slug, {
      id: event.id,
      slug: event.slug,
      name: event.name,
      gameName: event.gameName,
      status: event.status,
      state: event.state,
    });
  }

  const data = Array.from(eventMap.values())
    .sort(
      (firstEvent, secondEvent) =>
        firstEvent.gameName.localeCompare(secondEvent.gameName) || firstEvent.name.localeCompare(secondEvent.name),
    )
    .map((event) => ({
      id: event.id,
      slug: event.slug,
      name: event.name,
      gameName: event.gameName,
      status: event.status,
      state: event.state,
    }));

  return Response.json({ success: true, data });
}
