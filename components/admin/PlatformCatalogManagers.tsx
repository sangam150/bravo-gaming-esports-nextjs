"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import FileUpload from "./FileUpload";
import { adminFetch } from "@/lib/admin-api";
import type { ManagedPlatformEventRecord, ManagedPlatformGameRecord } from "@/lib/platform-cms";
import type { SponsorItem, VideoItem } from "@/lib/types";

const inputClass = "input-esports";
const btnPrimary = "btn-primary disabled:opacity-60";

function splitDelimitedValues(value?: string | null) {
  return Array.from(new Set((value ?? "").split(/[\n,]+/g).map((item) => item.trim()).filter(Boolean)));
}

function joinDelimitedValues(values?: string[] | null) {
  return values?.join(", ") ?? "";
}

function isValidOptionalLink(value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return true;
  return normalizedValue.startsWith("/") || /^https?:\/\//i.test(normalizedValue);
}

type SponsorEventOption = {
  id: string;
  slug: string;
  name: string;
  gameName: string;
  status: string;
  state?: string;
};

function SectionShell({
  title,
  description,
  form,
  list,
}: {
  title: string;
  description: string;
  form: React.ReactNode;
  list: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr,0.95fr]">
        {form}
        {list}
      </div>
    </div>
  );
}

function MessageLine({ message, error }: { message?: string | null; error?: string | null }) {
  if (!message && !error) return null;

  return (
    <div
      className={`rounded-card border px-4 py-3 text-sm ${
        error ? "border-bravoRed/30 bg-bravoRed/10 text-red-200" : "border-accent-green/30 bg-accent-green/10 text-green-200"
      }`}
    >
      {error ?? message}
    </div>
  );
}

const defaultGameForm: Partial<ManagedPlatformGameRecord> = {
  slug: "",
  name: "",
  shortName: "",
  tagline: "",
  summary: "",
  status: "planned",
  flagship: false,
  heroLabel: "Game Hub",
  primaryHref: "",
  analyticsHref: "",
  sections: ["Overview", "Events", "Teams", "Players", "Matches", "Rankings", "Media", "News"],
  completionLabel: "",
  published: true,
};

export function AdminGamesManager() {
  const [games, setGames] = useState<ManagedPlatformGameRecord[]>([]);
  const [form, setForm] = useState<Partial<ManagedPlatformGameRecord>>(defaultGameForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/games");
      setGames(response.data ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load games");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultGameForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        sections: form.sections ?? [],
      };
      const response = await adminFetch(editingId ? `/api/admin/games/${editingId}` : "/api/admin/games", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setMessage(editingId ? "Game updated" : "Game created");
      resetForm();
      setGames((response.data ? [response.data, ...games.filter((game) => game.id !== response.data.id)] : games) as ManagedPlatformGameRecord[]);
      await loadGames();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save game");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this game lane?")) return;

    try {
      await adminFetch(`/api/admin/games/${id}`, { method: "DELETE" });
      setGames((currentGames) => currentGames.filter((game) => game.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setMessage("Game removed");
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete game");
    }
  }

  return (
    <SectionShell
      title="Games"
      description="Create and maintain the platform-level game hubs shown across `/games`, homepage modules, and multi-title navigation."
      form={
        <form onSubmit={handleSubmit} className="esports-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{editingId ? "Edit game" : "Create game"}</p>
            {editingId ? (
              <button type="button" onClick={resetForm} className="btn-secondary !text-[11px]">
                New game
              </button>
            ) : null}
          </div>
          <MessageLine message={message} error={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className={inputClass} placeholder="Game name" value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <input className={inputClass} placeholder="Slug" value={form.slug ?? ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <input className={inputClass} placeholder="Short name" value={form.shortName ?? ""} onChange={(event) => setForm({ ...form, shortName: event.target.value })} />
            <select className={inputClass} value={form.status ?? "planned"} onChange={(event) => setForm({ ...form, status: event.target.value as ManagedPlatformGameRecord["status"] })}>
              <option value="flagship">Flagship</option>
              <option value="active">Active</option>
              <option value="building">Building</option>
              <option value="planned">Planned</option>
            </select>
            <input className={`${inputClass} sm:col-span-2`} placeholder="Tagline" value={form.tagline ?? ""} onChange={(event) => setForm({ ...form, tagline: event.target.value })} />
            <textarea className={`${inputClass} sm:col-span-2`} rows={4} placeholder="Summary" value={form.summary ?? ""} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            <input className={inputClass} placeholder="Hero label" value={form.heroLabel ?? ""} onChange={(event) => setForm({ ...form, heroLabel: event.target.value })} />
            <input className={inputClass} placeholder="Primary href" value={form.primaryHref ?? ""} onChange={(event) => setForm({ ...form, primaryHref: event.target.value })} />
            <input className={inputClass} placeholder="Analytics href" value={form.analyticsHref ?? ""} onChange={(event) => setForm({ ...form, analyticsHref: event.target.value })} />
            <input className={inputClass} placeholder="Completion label" value={form.completionLabel ?? ""} onChange={(event) => setForm({ ...form, completionLabel: event.target.value })} />
            <textarea
              className={`${inputClass} sm:col-span-2`}
              rows={3}
              placeholder="Sections (comma separated)"
              value={joinDelimitedValues(form.sections)}
              onChange={(event) => setForm({ ...form, sections: splitDelimitedValues(event.target.value) })}
            />
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={Boolean(form.flagship)} onChange={(event) => setForm({ ...form, flagship: event.target.checked })} />
              Flagship game
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.published !== false} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
              Published
            </label>
          </div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving..." : editingId ? "Update Game" : "Create Game"}
          </button>
        </form>
      }
      list={
        <div className="esports-card p-6">
          <p className="font-semibold text-white">Published and draft games</p>
          <div className="mt-5 space-y-3">
            {games.map((game) => (
              <div key={game.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{game.name}</p>
                    <p className="text-sm text-text-muted">
                      {game.slug} | {game.status} | {game.published ? "published" : "draft"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => { setEditingId(game.id); setForm(game); }} className="text-accent-blue hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDelete(game.id)} className="text-bravoRed hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{game.summary}</p>
              </div>
            ))}
            {!loading && games.length === 0 ? (
              <div className="rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                No admin-managed game lanes yet.
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

const defaultEventForm: Partial<ManagedPlatformEventRecord> = {
  slug: "",
  name: "",
  gameSlug: "pubg-pc",
  gameName: "PUBG PC",
  type: "tournament",
  status: "upcoming",
  state: "published",
  featured: false,
  region: "Nepal",
  organizerName: "Bravo Gaming Esports",
  prizePool: "TBD",
  teamsCount: 0,
  matchesCount: 0,
  startDate: "",
  endDate: "",
  bannerUrl: "",
  summary: "",
  analyticsHref: "",
  streamHref: "",
  topTeamName: "",
  topPlayerName: "",
  sponsorName: "",
  pointSystemId: "bravo-pubg-default",
  pointSystemName: "Bravo PUBG",
  tabs: ["Overview", "Teams", "Matches", "Schedule", "Statistics", "Sponsors", "Rules"],
  published: true,
};

export function AdminPlatformEventsManager() {
  const [events, setEvents] = useState<ManagedPlatformEventRecord[]>([]);
  const [form, setForm] = useState<Partial<ManagedPlatformEventRecord>>(defaultEventForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/platform-events");
      setEvents(response.data ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultEventForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch(
        editingId ? `/api/admin/platform-events/${editingId}` : "/api/admin/platform-events",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({ ...form, tabs: form.tabs ?? [] }),
        }
      );
      setMessage(editingId ? "Event updated" : "Event created");
      setEvents((currentEvents) => {
        const savedEvent = response.data as ManagedPlatformEventRecord;
        return [savedEvent, ...currentEvents.filter((item) => item.id !== savedEvent.id)];
      });
      resetForm();
      await loadEvents();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save event");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this platform event?")) return;

    try {
      await adminFetch(`/api/admin/platform-events/${id}`, { method: "DELETE" });
      setEvents((currentEvents) => currentEvents.filter((event) => event.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setMessage("Event removed");
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete event");
    }
  }

  const uploadEntityId = editingId ?? form.slug ?? "platform-event-draft";

  return (
    <SectionShell
      title="Events"
      description="Manage the cross-title public events hub, including banners, publish state, tabs, sponsor context, and game-lane mapping."
      form={
        <form onSubmit={handleSubmit} className="esports-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{editingId ? "Edit event" : "Create event"}</p>
            {editingId ? (
              <button type="button" onClick={resetForm} className="btn-secondary !text-[11px]">
                New event
              </button>
            ) : null}
          </div>
          <MessageLine message={message} error={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className={inputClass} placeholder="Event name" value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <input className={inputClass} placeholder="Slug" value={form.slug ?? ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <input className={inputClass} placeholder="Game name" value={form.gameName ?? ""} onChange={(event) => setForm({ ...form, gameName: event.target.value })} />
            <input className={inputClass} placeholder="Game slug" value={form.gameSlug ?? ""} onChange={(event) => setForm({ ...form, gameSlug: event.target.value })} />
            <input className={inputClass} placeholder="Type" value={form.type ?? ""} onChange={(event) => setForm({ ...form, type: event.target.value })} />
            <select className={inputClass} value={form.status ?? "upcoming"} onChange={(event) => setForm({ ...form, status: event.target.value as ManagedPlatformEventRecord["status"] })}>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
            </select>
            <select className={inputClass} value={form.state ?? "published"} onChange={(event) => setForm({ ...form, state: event.target.value as ManagedPlatformEventRecord["state"] })}>
              <option value="published">Published</option>
              <option value="planned">Planned</option>
              <option value="coming_soon">Draft</option>
            </select>
            <input className={inputClass} placeholder="Region" value={form.region ?? ""} onChange={(event) => setForm({ ...form, region: event.target.value })} />
            <input className={inputClass} placeholder="Organizer" value={form.organizerName ?? ""} onChange={(event) => setForm({ ...form, organizerName: event.target.value })} />
            <input className={inputClass} placeholder="Prize pool" value={form.prizePool ?? ""} onChange={(event) => setForm({ ...form, prizePool: event.target.value })} />
            <input className={inputClass} type="number" placeholder="Teams count" value={form.teamsCount ?? 0} onChange={(event) => setForm({ ...form, teamsCount: Number(event.target.value) })} />
            <input className={inputClass} type="number" placeholder="Matches count" value={form.matchesCount ?? 0} onChange={(event) => setForm({ ...form, matchesCount: Number(event.target.value) })} />
            <input className={inputClass} type="datetime-local" value={(form.startDate ?? "").slice(0, 16)} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            <input className={inputClass} type="datetime-local" value={(form.endDate ?? "").slice(0, 16)} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
            <textarea className={`${inputClass} sm:col-span-2`} rows={4} placeholder="Summary" value={form.summary ?? ""} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            <input className={inputClass} placeholder="Analytics href" value={form.analyticsHref ?? ""} onChange={(event) => setForm({ ...form, analyticsHref: event.target.value })} />
            <input className={inputClass} placeholder="Stream href" value={form.streamHref ?? ""} onChange={(event) => setForm({ ...form, streamHref: event.target.value })} />
            <input className={inputClass} placeholder="Top team name" value={form.topTeamName ?? ""} onChange={(event) => setForm({ ...form, topTeamName: event.target.value })} />
            <input className={inputClass} placeholder="Top player name" value={form.topPlayerName ?? ""} onChange={(event) => setForm({ ...form, topPlayerName: event.target.value })} />
            <input className={inputClass} placeholder="Sponsor name" value={form.sponsorName ?? ""} onChange={(event) => setForm({ ...form, sponsorName: event.target.value })} />
            <input className={inputClass} placeholder="Point system id" value={form.pointSystemId ?? ""} onChange={(event) => setForm({ ...form, pointSystemId: event.target.value })} />
            <input className={inputClass} placeholder="Point system name" value={form.pointSystemName ?? ""} onChange={(event) => setForm({ ...form, pointSystemName: event.target.value })} />
            <textarea
              className={`${inputClass} sm:col-span-2`}
              rows={3}
              placeholder="Tabs (comma separated)"
              value={joinDelimitedValues(form.tabs)}
              onChange={(event) => setForm({ ...form, tabs: splitDelimitedValues(event.target.value) })}
            />
          </div>
          <FileUpload
            type="tournament_banner"
            entityId={uploadEntityId}
            label="Event banner"
            currentUrl={form.bannerUrl ?? undefined}
            onUploaded={(url) => setForm((currentForm) => ({ ...currentForm, bannerUrl: url }))}
          />
          <div className="flex flex-wrap gap-5 text-sm text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />
              Featured
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.published !== false} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
              Published
            </label>
          </div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving..." : editingId ? "Update Event" : "Create Event"}
          </button>
        </form>
      }
      list={
        <div className="esports-card p-6">
          <p className="font-semibold text-white">Managed public events</p>
          <div className="mt-5 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{event.name}</p>
                    <p className="text-sm text-text-muted">
                      {event.gameName} | {event.status} | {event.pointSystemName ?? "Point system pending"} | {event.published ? "published" : "draft"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => { setEditingId(event.id); setForm(event); }} className="text-accent-blue hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDelete(event.id)} className="text-bravoRed hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{event.summary}</p>
              </div>
            ))}
            {!loading && events.length === 0 ? (
              <div className="rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                No admin-managed platform events yet.
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

const defaultSponsorForm: Partial<SponsorItem> = {
  name: "",
  slug: "",
  kind: "partner",
  tier: "Partner",
  websiteUrl: "",
  socialUrl: "",
  logoUrl: "",
  bannerUrl: "",
  designAssetUrl: "",
  description: "",
  supportedEvents: [],
  eventSlugs: [],
  partnershipHistory: [],
  visible: true,
  featured: false,
  published: true,
  showOnHomepage: false,
  showOnSponsorsPage: true,
  showOnEventPage: false,
  showOnPubgPage: false,
};

const sponsorTemplates: Record<"sap" | "kento", Partial<SponsorItem>> = {
  sap: {
    name: "SAP",
    slug: "sap",
    kind: "partner",
    tier: "Technology Partner",
    description: "Partner details will be updated soon.",
    showOnSponsorsPage: true,
  },
  kento: {
    name: "Kento",
    slug: "kento",
    kind: "design",
    tier: "Design Partner",
    description: "Partner details will be updated soon.",
    showOnSponsorsPage: true,
  },
};

export function AdminSponsorsManager() {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [eventOptions, setEventOptions] = useState<SponsorEventOption[]>([]);
  const [form, setForm] = useState<Partial<SponsorItem>>(defaultSponsorForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const deferredEventSearch = useDeferredValue(eventSearch);

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/sponsors");
      setSponsors(response.data ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load sponsors");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEventOptions = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const response = await adminFetch("/api/admin/platform-event-options");
      setEventOptions(response.data ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load event options");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    void loadSponsors();
  }, [loadSponsors]);

  useEffect(() => {
    void loadEventOptions();
  }, [loadEventOptions]);

  const optionBySlug = new Map(eventOptions.map((eventOption) => [eventOption.slug, eventOption]));
  const selectedEventSlugs = form.eventSlugs ?? [];
  const selectedEvents = selectedEventSlugs.map((eventSlug) => optionBySlug.get(eventSlug) ?? null);
  const filteredEventOptions = eventOptions.filter((eventOption) => {
    const searchNeedle = deferredEventSearch.trim().toLowerCase();
    if (!searchNeedle) return true;
    return `${eventOption.name} ${eventOption.slug} ${eventOption.gameName} ${eventOption.status}`.toLowerCase().includes(searchNeedle);
  });

  function resetForm() {
    setEditingId(null);
    setForm(defaultSponsorForm);
    setEventSearch("");
  }

  function updateSelectedEvents(nextEventSlugs: string[]) {
    const normalizedEventSlugs = Array.from(new Set(nextEventSlugs));
    const nextSupportedEvents = normalizedEventSlugs.map((eventSlug) => optionBySlug.get(eventSlug)?.name ?? eventSlug);

    setForm((currentForm) => ({
      ...currentForm,
      eventSlugs: normalizedEventSlugs,
      supportedEvents: nextSupportedEvents,
      showOnEventPage: normalizedEventSlugs.length > 0 ? true : Boolean(currentForm.showOnEventPage),
    }));
  }

  function toggleEventSelection(eventSlug: string) {
    const nextEventSlugs = selectedEventSlugs.includes(eventSlug)
      ? selectedEventSlugs.filter((selectedSlug) => selectedSlug !== eventSlug)
      : [...selectedEventSlugs, eventSlug];
    updateSelectedEvents(nextEventSlugs);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name) return;

    if (!isValidOptionalLink(form.websiteUrl ?? form.url)) {
      setError("Website URL must start with https://, http://, or /.");
      return;
    }

    if (!isValidOptionalLink(form.socialUrl)) {
      setError("Social URL must start with https://, http://, or /.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch(editingId ? `/api/admin/sponsors/${editingId}` : "/api/admin/sponsors", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          url: form.websiteUrl ?? form.url,
          supportedEvents: form.supportedEvents ?? [],
          eventSlugs: form.eventSlugs ?? [],
          partnershipHistory: form.partnershipHistory ?? [],
        }),
      });
      setMessage(editingId ? "Sponsor updated" : "Sponsor created");
      setSponsors((currentSponsors) => {
        const savedSponsor = response.data as SponsorItem;
        return [savedSponsor, ...currentSponsors.filter((item) => item.id !== savedSponsor.id)];
      });
      resetForm();
      await loadSponsors();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save sponsor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this sponsor?")) return;

    try {
      await adminFetch(`/api/admin/sponsors/${id}`, { method: "DELETE" });
      setSponsors((currentSponsors) => currentSponsors.filter((sponsor) => sponsor.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setMessage("Sponsor removed");
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete sponsor");
    }
  }

  const uploadEntityId = editingId ?? form.slug ?? "sponsor-draft";

  return (
    <SectionShell
      title="Sponsors"
      description="Create sponsor, partner, and design entries with Supabase-hosted assets, page placement controls, homepage featuring, and event assignment."
      form={
        <form onSubmit={handleSubmit} className="esports-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{editingId ? "Edit sponsor" : "Create sponsor"}</p>
            {editingId ? (
              <button type="button" onClick={resetForm} className="btn-secondary !text-[11px]">
                New sponsor
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ ...defaultSponsorForm, ...sponsorTemplates.sap });
              }}
              className="btn-secondary !text-[11px]"
            >
              Load SAP template
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ ...defaultSponsorForm, ...sponsorTemplates.kento });
              }}
              className="btn-secondary !text-[11px]"
            >
              Load Kento template
            </button>
          </div>
          <MessageLine message={message} error={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className={inputClass} placeholder="Sponsor or partner name" value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <input className={inputClass} placeholder="Slug" value={form.slug ?? ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <select className={inputClass} value={form.kind ?? "partner"} onChange={(event) => setForm({ ...form, kind: event.target.value as SponsorItem["kind"] })}>
              <option value="sponsor">Sponsor</option>
              <option value="partner">Partner</option>
              <option value="design">Design</option>
            </select>
            <input className={inputClass} placeholder="Tier" value={form.tier ?? ""} onChange={(event) => setForm({ ...form, tier: event.target.value })} />
            <input
              className={inputClass}
              placeholder="Website URL (https://...)"
              value={form.websiteUrl ?? form.url ?? ""}
              onChange={(event) => setForm({ ...form, websiteUrl: event.target.value, url: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Social URL (https://...)"
              value={form.socialUrl ?? ""}
              onChange={(event) => setForm({ ...form, socialUrl: event.target.value })}
            />
            <textarea
              className={`${inputClass} sm:col-span-2`}
              rows={4}
              placeholder="Description"
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <textarea
              className={`${inputClass} sm:col-span-2`}
              rows={3}
              placeholder="Partnership history"
              value={joinDelimitedValues(form.partnershipHistory)}
              onChange={(event) => setForm({ ...form, partnershipHistory: splitDelimitedValues(event.target.value) })}
            />
          </div>
          <div className="rounded-card border border-white/10 bg-bg-primary p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Event Assignment</p>
                <p className="mt-1 text-sm text-text-muted">Search and assign events here. The sponsor saves event slugs internally and shows event names publicly.</p>
              </div>
              <div className="text-xs uppercase tracking-[0.12em] text-text-muted">
                {selectedEventSlugs.length} selected
              </div>
            </div>
            <input
              className={`${inputClass} mt-4`}
              placeholder="Search events by name, slug, game, or status"
              value={eventSearch}
              onChange={(event) => setEventSearch(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedEventSlugs.length > 0 ? (
                selectedEventSlugs.map((eventSlug) => {
                  const selectedEvent = optionBySlug.get(eventSlug);
                  return (
                    <button
                      key={eventSlug}
                      type="button"
                      onClick={() => toggleEventSelection(eventSlug)}
                      className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-accent-blue transition hover:border-accent-blue hover:text-white"
                    >
                      {selectedEvent?.name ?? eventSlug} | remove
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-text-muted">No events assigned yet.</p>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {loadingEvents ? (
                <p className="text-sm text-text-muted">Loading event options...</p>
              ) : filteredEventOptions.length === 0 ? (
                <p className="text-sm text-text-muted">No matching events found.</p>
              ) : (
                filteredEventOptions.slice(0, 8).map((eventOption) => {
                  const isSelected = selectedEventSlugs.includes(eventOption.slug);
                  return (
                    <button
                      key={eventOption.id}
                      type="button"
                      onClick={() => toggleEventSelection(eventOption.slug)}
                      className={`flex w-full items-center justify-between rounded-card border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-accent-blue/40 bg-accent-blue/10"
                          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">{eventOption.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                          {eventOption.gameName} | {eventOption.slug} | {eventOption.status}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-blue">
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <FileUpload
            type="sponsor_asset"
            entityId={uploadEntityId}
            label="Logo asset"
            currentUrl={form.logoUrl ?? undefined}
            onUploaded={(url) => setForm((currentForm) => ({ ...currentForm, logoUrl: url }))}
          />
          <FileUpload
            type="sponsor_asset"
            entityId={uploadEntityId}
            label="Banner asset"
            currentUrl={form.bannerUrl ?? undefined}
            onUploaded={(url) => setForm((currentForm) => ({ ...currentForm, bannerUrl: url }))}
          />
          <FileUpload
            type="sponsor_asset"
            entityId={uploadEntityId}
            label="Design asset"
            currentUrl={form.designAssetUrl ?? undefined}
            onUploaded={(url) => setForm((currentForm) => ({ ...currentForm, designAssetUrl: url }))}
          />
          <div className="flex flex-wrap gap-5 text-sm text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.visible !== false} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />
              Show publicly
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />
              Featured
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.published !== false} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
              Published
            </label>
          </div>
          <div className="grid gap-3 rounded-card border border-white/10 bg-bg-primary p-4 sm:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={Boolean(form.showOnHomepage)} onChange={(event) => setForm({ ...form, showOnHomepage: event.target.checked })} />
              Homepage section
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.showOnSponsorsPage !== false} onChange={(event) => setForm({ ...form, showOnSponsorsPage: event.target.checked })} />
              Sponsors page
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={Boolean(form.showOnEventPage)} onChange={(event) => setForm({ ...form, showOnEventPage: event.target.checked })} />
              Event sponsor sections
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={Boolean(form.showOnPubgPage)} onChange={(event) => setForm({ ...form, showOnPubgPage: event.target.checked })} />
              PUBG page partner section
            </label>
          </div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving..." : editingId ? "Update Sponsor" : "Create Sponsor"}
          </button>
        </form>
      }
      list={
        <div className="esports-card p-6">
          <p className="font-semibold text-white">Sponsor records</p>
          <div className="mt-5 space-y-3">
            {sponsors.map((sponsor) => (
              <div key={sponsor.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{sponsor.name}</p>
                    <p className="text-sm text-text-muted">
                      {(sponsor.kind ?? "partner").toUpperCase()} | {sponsor.tier} | {sponsor.published !== false ? "published" : "draft"} | {sponsor.visible !== false ? "visible" : "hidden"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => { setEditingId(sponsor.id); setForm(sponsor); }} className="text-accent-blue hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDelete(sponsor.id)} className="text-bravoRed hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{sponsor.description ?? "No description yet."}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-muted">
                  {[
                    sponsor.showOnHomepage ? "homepage" : null,
                    sponsor.showOnSponsorsPage !== false ? "sponsors" : null,
                    sponsor.showOnEventPage ? "events" : null,
                    sponsor.showOnPubgPage ? "pubg" : null,
                  ]
                    .filter(Boolean)
                    .join(" | ") || "no public placements"}
                </p>
                {sponsor.eventSlugs?.length ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Assigned events: {sponsor.eventSlugs.map((eventSlug) => optionBySlug.get(eventSlug)?.name ?? eventSlug).join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
            {!loading && sponsors.length === 0 ? (
              <div className="rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                No sponsor records yet.
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

const defaultMediaForm: Partial<VideoItem> = {
  title: "",
  category: "Highlights",
  duration: "00:00",
  url: "",
  kind: "Video",
  gameSlug: "pubg-pc",
  summary: "",
  imageUrl: "",
  featured: false,
  published: true,
};

export function AdminMediaManager() {
  const [mediaItems, setMediaItems] = useState<VideoItem[]>([]);
  const [form, setForm] = useState<Partial<VideoItem>>(defaultMediaForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/media");
      setMediaItems(response.data ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultMediaForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch(editingId ? `/api/admin/media/${editingId}` : "/api/admin/media", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setMessage(editingId ? "Media item updated" : "Media item created");
      setMediaItems((currentItems) => {
        const savedItem = response.data as VideoItem;
        return [savedItem, ...currentItems.filter((item) => item.id !== savedItem.id)];
      });
      resetForm();
      await loadMedia();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save media item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this media item?")) return;

    try {
      await adminFetch(`/api/admin/media/${id}`, { method: "DELETE" });
      setMediaItems((currentItems) => currentItems.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setMessage("Media item removed");
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete media item");
    }
  }

  const uploadEntityId = editingId ?? form.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? "media-draft";

  return (
    <SectionShell
      title="Media"
      description="Manage posters, highlights, interviews, VOD cards, and other public media entries with Supabase-hosted images."
      form={
        <form onSubmit={handleSubmit} className="esports-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{editingId ? "Edit media" : "Create media"}</p>
            {editingId ? (
              <button type="button" onClick={resetForm} className="btn-secondary !text-[11px]">
                New media
              </button>
            ) : null}
          </div>
          <MessageLine message={message} error={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className={inputClass} placeholder="Title" value={form.title ?? ""} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <input className={inputClass} placeholder="Kind" value={form.kind ?? ""} onChange={(event) => setForm({ ...form, kind: event.target.value })} />
            <input className={inputClass} placeholder="Category" value={form.category ?? ""} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            <input className={inputClass} placeholder="Game slug" value={form.gameSlug ?? ""} onChange={(event) => setForm({ ...form, gameSlug: event.target.value })} />
            <input className={inputClass} placeholder="Duration" value={form.duration ?? ""} onChange={(event) => setForm({ ...form, duration: event.target.value })} />
            <input className={inputClass} placeholder="Public URL / YouTube / VOD" value={form.url ?? ""} onChange={(event) => setForm({ ...form, url: event.target.value })} />
            <textarea className={`${inputClass} sm:col-span-2`} rows={4} placeholder="Summary" value={form.summary ?? ""} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          </div>
          <FileUpload
            type="announcement_image"
            entityId={uploadEntityId}
            label="Media image"
            currentUrl={form.imageUrl ?? undefined}
            onUploaded={(url) => setForm((currentForm) => ({ ...currentForm, imageUrl: url }))}
          />
          <div className="flex flex-wrap gap-5 text-sm text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />
              Featured
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.published !== false} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
              Published
            </label>
          </div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving..." : editingId ? "Update Media" : "Create Media"}
          </button>
        </form>
      }
      list={
        <div className="esports-card p-6">
          <p className="font-semibold text-white">Media library</p>
          <div className="mt-5 space-y-3">
            {mediaItems.map((item) => (
              <div key={item.id} className="rounded-card border border-white/10 bg-bg-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-text-muted">
                      {item.kind ?? "Media"} | {item.category} | {item.published !== false ? "published" : "draft"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => { setEditingId(item.id); setForm(item); }} className="text-accent-blue hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDelete(item.id)} className="text-bravoRed hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{item.summary ?? "No summary yet."}</p>
              </div>
            ))}
            {!loading && mediaItems.length === 0 ? (
              <div className="rounded-card border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                No media items published from admin yet.
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
