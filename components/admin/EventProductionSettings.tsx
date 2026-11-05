"use client";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { scheduleEffectTask } from "@/lib/effect-task";
import { DEFAULT_EVENT_PRODUCTION, parseEventProduction, type EventProduction } from "@/lib/event-production";
import type { Announcement, Team, SponsorItem } from "@/lib/types";
import FileUpload from "./FileUpload";
import EventSponsorAssignments from "./EventSponsorAssignments";
import type { TournamentMatch } from "@/lib/types";
import type { PointSystemRecord } from "@/lib/competition-scoring";

const id = () => globalThis.crypto?.randomUUID?.() ?? `production-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export default function EventProductionSettings({
  tournamentId,
  teams,
  canApprove,
  announcements = [],
}: {
  tournamentId: string;
  teams: Team[];
  canApprove: boolean;
  announcements?: Announcement[];
}) {
  const [config, setConfig] = useState<EventProduction>(DEFAULT_EVENT_PRODUCTION);
  const [revision, setRevision] = useState(0);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [pointSystems, setPointSystems] = useState<PointSystemRecord[]>([]);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [response, sponsorResponse, eventResponse, pointsResponse] = await Promise.all([
        adminFetch(`/api/tournaments/${encodeURIComponent(tournamentId)}?production=true`),
        adminFetch("/api/admin/sponsors"),
        adminFetch(`/api/tournaments/${encodeURIComponent(tournamentId)}?admin=true`),
        adminFetch("/api/admin/point-systems"),
      ]);
      setPointSystems(pointsResponse.data ?? []);
      setMatches(eventResponse.data.matches ?? []);
      setConfig(parseEventProduction(response.data.draft));
      setRevision(response.data.revision);
      setSponsors(sponsorResponse.data ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Event settings unavailable.");
    } finally {
      setBusy(false);
    }
  }, [tournamentId]);
  useEffect(() => scheduleEffectTask(load), [load]);
  async function save(approve: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const production = parseEventProduction(config);
      const response = await adminFetch(`/api/tournaments/${encodeURIComponent(tournamentId)}`, {
        method: "PUT",
        body: JSON.stringify({ productionAction: approve ? "approve" : "draft", productionRevision: revision, production }),
      });
      setConfig(response.data.draft);
      setRevision(response.data.revision);
      setMessage(
        approve ? "Production settings approved. Published event graphics will refresh." : "Draft saved. Public graphics are unchanged.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save event settings.");
    } finally {
      setBusy(false);
    }
  }
  function text(
    key: keyof Pick<EventProduction, "shortName" | "organizerName" | "hostCountry" | "region" | "edition" | "currency" | "timeZone">,
    label: string,
  ) {
    return (
      <label key={key} className="block text-sm">
        {label}
        <input
          className="input-esports"
          value={config[key]}
          maxLength={key === "currency" ? 3 : 160}
          onChange={(event) => setConfig({ ...config, [key]: event.target.value })}
        />
      </label>
    );
  }
  function stages(value: string, change: (id: string) => void) {
    return (
      <select aria-label="Stage assignment" className="input-esports" value={value} onChange={(event) => change(event.target.value)}>
        <option value="">Select stage</option>
        {config.stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name || "Untitled stage"}
            {stage.archived ? " (archived)" : ""}
          </option>
        ))}
      </select>
    );
  }
  return (
    <section className="esports-card space-y-5 p-5" aria-label="Event production settings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Event production settings</h2>
          <p className="text-sm text-text-muted">Draft → approval → published event graphics. Revision {revision}.</p>
        </div>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void load()}>
          Reload settings
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-red-200">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <details open>
        <summary className="cursor-pointer font-semibold">Branding and international settings</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {text("shortName", "Short tournament name")}
          {text("organizerName", "Organizer")}
          {text("hostCountry", "Host country")}
          {text("region", "Region")}
          {text("edition", "Edition / year")}
          {text("currency", "Prize currency")}
          {text("timeZone", "Event timezone")}
          <label className="block text-sm">
            Official links (one per line)
            <textarea
              className="input-esports"
              value={config.officialLinks.join("\n")}
              onChange={(event) => setConfig({ ...config, officialLinks: event.target.value.split("\n").filter(Boolean) })}
            />
          </label>
          <fieldset className="space-y-2 sm:col-span-2"><legend className="text-sm">Official event announcements</legend>{announcements.filter(item => item.published === true).map(item => <label key={item.id} className="flex gap-2 text-sm"><input type="checkbox" checked={config.announcementIds.includes(item.id)} onChange={event => setConfig({ ...config, announcementIds: event.target.checked ? [...config.announcementIds, item.id] : config.announcementIds.filter(id => id !== item.id) })} />{item.title}</label>)}{!announcements.some(item => item.published) && <p className="text-xs text-text-muted">Publish an announcement in Content, then assign it here.</p>}</fieldset>
          <FileUpload
            type="media_asset"
            entityId={`${tournamentId}-event-logo`}
            label="Event logo (transparent PNG/WebP recommended)"
            currentUrl={config.eventLogo}
            onUploaded={(url) => setConfig({ ...config, eventLogo: url })}
          />
          <FileUpload
            type="media_asset"
            entityId={`${tournamentId}-organizer-logo`}
            label="Organizer logo"
            currentUrl={config.organizerLogo}
            onUploaded={(url) => setConfig({ ...config, organizerLogo: url })}
          />
        </div>
      </details>
      <details>
        <summary className="cursor-pointer font-semibold">Stages, groups and match days</summary>
        <div className="mt-4 space-y-5">
          {config.stages.map((stage, index) => (
            <fieldset key={stage.id} className="grid gap-3 rounded border border-white/10 p-3 sm:grid-cols-3">
              <legend>Stage {index + 1}</legend>
              <label>
                Name
                <input
                  className="input-esports"
                  value={stage.name}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      stages: config.stages.map((row) => (row.id === stage.id ? { ...row, name: event.target.value } : row)),
                    })
                  }
                />
              </label>
              <label>
                Order
                <input
                  type="number"
                  min={0}
                  className="input-esports"
                  value={stage.order}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      stages: config.stages.map((row) => (row.id === stage.id ? { ...row, order: Number(event.target.value) } : row)),
                    })
                  }
                />
              </label>
              <label>
                Advancing teams
                <input
                  type="number"
                  min={0}
                  max={1000}
                  className="input-esports"
                  value={stage.advanceCount}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      stages: config.stages.map((row) =>
                        row.id === stage.id ? { ...row, advanceCount: Number(event.target.value) } : row,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Scoring version
                <select
                  className="input-esports"
                  value={stage.pointSystemId}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      stages: config.stages.map((row) => (row.id === stage.id ? { ...row, pointSystemId: event.target.value } : row)),
                    })
                  }
                >
                  <option value="">Event default</option>
                  {pointSystems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-text-muted">
                  After approval, applies to new matches using stage/event scoring. Existing saved match versions remain selected.
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={stage.completed ?? false}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      stages: config.stages.map((row) => (row.id === stage.id ? { ...row, completed: event.target.checked } : row)),
                    })
                  }
                />
                Stage completed (after approval and all scheduled results are published, advancement positions become final)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={stage.archived}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      stages: config.stages.map((row) => (row.id === stage.id ? { ...row, archived: event.target.checked } : row)),
                    })
                  }
                />
                Archived (history retained)
              </label>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setConfig({
                ...config,
                stages: [
                  ...config.stages,
                  { id: id(), name: "", order: config.stages.length, archived: false, pointSystemId: "", advanceCount: 0 },
                ],
              })
            }
          >
            Add stage
          </button>
          {config.groups.map((group) => (
            <fieldset key={group.id} className="space-y-3 rounded border border-white/10 p-3">
              <legend>Group</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  aria-label="Group name"
                  className="input-esports"
                  value={group.name}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      groups: config.groups.map((row) => (row.id === group.id ? { ...row, name: event.target.value } : row)),
                    })
                  }
                />
                {stages(group.stageId, (stageId) =>
                  setConfig({ ...config, groups: config.groups.map((row) => (row.id === group.id ? { ...row, stageId } : row)) }),
                )}
                <label>
                  Order
                  <input
                    type="number"
                    min={0}
                    className="input-esports"
                    value={group.order}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        groups: config.groups.map((row) => (row.id === group.id ? { ...row, order: Number(event.target.value) } : row)),
                      })
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                {teams.map((team) => (
                  <label key={team.id} className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={group.teamIds.includes(team.id)}
                      onChange={(event) =>
                        setConfig({
                          ...config,
                          groups: config.groups.map((row) =>
                            row.id === group.id
                              ? {
                                  ...row,
                                  teamIds: event.target.checked
                                    ? [...row.teamIds, team.id]
                                    : row.teamIds.filter((teamId) => teamId !== team.id),
                                }
                              : row,
                          ),
                        })
                      }
                    />
                    {team.name}
                  </label>
                ))}
              </div>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={group.archived}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      groups: config.groups.map((row) => (row.id === group.id ? { ...row, archived: event.target.checked } : row)),
                    })
                  }
                />
                Archived
              </label>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-secondary"
            disabled={!config.stages.length}
            onClick={() =>
              setConfig({
                ...config,
                groups: [
                  ...config.groups,
                  { id: id(), stageId: config.stages[0].id, name: "", teamIds: [], order: config.groups.length, archived: false },
                ],
              })
            }
          >
            Add group
          </button>
          {config.days.map((day) => (
            <fieldset key={day.id} className="grid gap-3 rounded border border-white/10 p-3 sm:grid-cols-4">
              <legend>Match day</legend>
              <label>
                Day label
                <input
                  className="input-esports"
                  value={day.name}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      days: config.days.map((row) => (row.id === day.id ? { ...row, name: event.target.value } : row)),
                    })
                  }
                />
              </label>
              {stages(day.stageId, (stageId) =>
                setConfig({ ...config, days: config.days.map((row) => (row.id === day.id ? { ...row, stageId } : row)) }),
              )}
              <label>
                Date
                <input
                  type="date"
                  className="input-esports"
                  value={day.date}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      days: config.days.map((row) => (row.id === day.id ? { ...row, date: event.target.value } : row)),
                    })
                  }
                />
              </label>
              <label>
                Order
                <input
                  type="number"
                  min={0}
                  className="input-esports"
                  value={day.order}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      days: config.days.map((row) => (row.id === day.id ? { ...row, order: Number(event.target.value) } : row)),
                    })
                  }
                />
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={day.archived}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      days: config.days.map((row) => (row.id === day.id ? { ...row, archived: event.target.checked } : row)),
                    })
                  }
                />
                Archived
              </label>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-secondary"
            disabled={!config.stages.length}
            onClick={() =>
              setConfig({
                ...config,
                days: [
                  ...config.days,
                  { id: id(), stageId: config.stages[0].id, name: "", date: "", order: config.days.length, archived: false },
                ],
              })
            }
          >
            Add match day
          </button>
        </div>
      </details>
      <details>
        <summary className="cursor-pointer font-semibold">Map library</summary>
        <div className="mt-4 space-y-4">
          {config.maps.map((map) => (
            <fieldset key={map.id} className="space-y-3 rounded border border-white/10 p-3">
              <legend>{map.name || "New map"}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["name", "label"] as const).map((key) => (
                  <label key={key}>
                    {key === "name" ? "Map name" : "Display label"}
                    <input
                      className="input-esports"
                      value={map[key]}
                      onChange={(event) =>
                        setConfig({
                          ...config,
                          maps: config.maps.map((row) => (row.id === map.id ? { ...row, [key]: event.target.value } : row)),
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Map order
                  <input
                    type="number"
                    min={0}
                    className="input-esports"
                    value={map.order}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        maps: config.maps.map((row) => (row.id === map.id ? { ...row, order: Number(event.target.value) } : row)),
                      })
                    }
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["artwork", "thumbnail", "background", "annotations"] as const).map((key) => (
                  <FileUpload
                    key={key}
                    type="media_asset"
                    entityId={`${tournamentId}-${map.id}-${key}`}
                    label={`Approved ${key}`}
                    currentUrl={map[key]}
                    onUploaded={(url) =>
                      setConfig({ ...config, maps: config.maps.map((row) => (row.id === map.id ? { ...row, [key]: url } : row)) })
                    }
                  />
                ))}
              </div>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={map.archived}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      maps: config.maps.map((row) => (row.id === map.id ? { ...row, archived: event.target.checked } : row)),
                    })
                  }
                />
                Archived
              </label>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setConfig({
                ...config,
                maps: [
                  ...config.maps,
                  {
                    id: id(),
                    name: "",
                    label: "",
                    artwork: "",
                    thumbnail: "",
                    background: "",
                    annotations: "",
                    order: config.maps.length,
                    archived: false,
                  },
                ],
              })
            }
          >
            Add map
          </button>
        </div>
      </details>
      <EventSponsorAssignments config={config} sponsors={sponsors} matches={matches} onChange={setConfig} />
      <details>
        <summary className="cursor-pointer font-semibold">Reusable event assets</summary>
        <div className="mt-4 space-y-4">
          {config.assets.map((asset) => (
            <fieldset key={asset.id} className="space-y-3 rounded border border-white/10 p-3">
              <legend>Asset</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  Asset name
                  <input
                    className="input-esports"
                    value={asset.name}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        assets: config.assets.map((row) => (row.id === asset.id ? { ...row, name: event.target.value } : row)),
                      })
                    }
                  />
                </label>
                <label>
                  Kind
                  <select
                    className="input-esports"
                    value={asset.kind}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        assets: config.assets.map((row) => (row.id === asset.id ? { ...row, kind: event.target.value } : row)),
                      })
                    }
                  >
                    {["background", "logo", "portrait", "stage-banner", "winner", "mvp", "break"].map((kind) => (
                      <option key={kind}>{kind}</option>
                    ))}
                  </select>
                </label>
              </div>
              <FileUpload
                type="media_asset"
                entityId={`${tournamentId}-${asset.id}`}
                label="Approved asset (1920×1080 backgrounds; transparent PNG/WebP logos)"
                currentUrl={asset.url}
                onUploaded={(url) =>
                  setConfig({ ...config, assets: config.assets.map((row) => (row.id === asset.id ? { ...row, url } : row)) })
                }
              />
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={asset.archived}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      assets: config.assets.map((row) => (row.id === asset.id ? { ...row, archived: event.target.checked } : row)),
                    })
                  }
                />
                Archived
              </label>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setConfig({ ...config, assets: [...config.assets, { id: id(), name: "", kind: "background", url: "", archived: false }] })
            }
          >
            Add asset
          </button>
        </div>
      </details>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} className="btn-secondary" onClick={() => void save(false)}>
          Save draft settings
        </button>
        <button type="button" disabled={busy || !canApprove} className="btn-primary" onClick={() => void save(true)}>
          Approve settings
        </button>
      </div>
      <p className="text-xs text-text-muted">
        Only protected administrators approve event settings. Archiving retains stable identities and historical match links. Official
        scores are managed in Match Results.
      </p>
    </section>
  );
}
