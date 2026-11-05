"use client";
import { useState } from "react";
import { BROADCAST_LABELS, defaultBroadcastTemplate, parseBroadcastTemplate, type BroadcastTemplate, type BroadcastLabelKey } from "@/lib/broadcast-template";
import type { BroadcastState } from "@/lib/broadcast";
import type { EventProduction } from "@/lib/event-production";
import FileUpload from "./FileUpload";

export default function BroadcastTemplateEditor({
  state,
  onChange,
  production,
}: {
  state: BroadcastState;
  onChange: (next: BroadcastState) => void;
  production: EventProduction | null;
}) {
  const [presetName, setPresetName] = useState("");
  const [notice, setNotice] = useState("");
  const template = state.templates?.[state.graphic] ?? defaultBroadcastTemplate(state.graphic);
  function update(patch: Partial<BroadcastTemplate>) {
    onChange({ ...state, templates: { ...state.templates, [state.graphic]: parseBroadcastTemplate({ ...template, ...patch }) } });
  }
  const library = production?.assets.filter((asset) => !asset.archived && asset.url) ?? [];
  return (
    <details className="rounded border border-white/15 p-4" open>
      <summary className="cursor-pointer font-bold">Edit graphic template</summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs text-text-muted">
          Presentation overrides never change official names, results or scores. Preview and mark ready before taking the edit live.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["title", "Main title"],
              ["subtitle", "Subtitle"],
              ["tournamentTitle", "Tournament display title"],
              ["dayLabel", "Day label"],
              ["matchLabel", "Match display label"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              {label}
              <input
                className="input-esports"
                maxLength={160}
                value={template[key]}
                onChange={(event) => update({ [key]: event.target.value })}
                placeholder="Automatic from official data"
              />
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Accent color
            <input
              className="input-esports"
              type="color"
              value={template.accent}
              onChange={(event) => update({ accent: event.target.value })}
            />
          </label>
          <label>
            Layout
            <select className="input-esports" value={template.layout} onChange={(event) => update({ layout: event.target.value })}>
              {["reference", "clean", "compact", "transparent"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Font preset
            <select className="input-esports" value={template.font} onChange={(event) => update({ font: event.target.value })}>
              <option value="condensed">Bold esports</option>
              <option value="sans">Clean sans</option>
            </select>
          </label>
          <label>
            Text alignment
            <select className="input-esports" value={template.alignment} onChange={(event) => update({ alignment: event.target.value })}>
              {["left", "center", "right"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      <details><summary className="cursor-pointer text-sm">On-screen labels and visible player statistics</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(BROADCAST_LABELS).map(([key, label]) => <label key={key} className="block text-sm">{label}<input className="input-esports" maxLength={60} value={template.labels?.[key as BroadcastLabelKey] || label} onChange={event => { if (event.target.value.trim()) update({ labels: { ...BROADCAST_LABELS, ...template.labels, [key]: event.target.value } }); }} /></label>)}</div><fieldset className="mt-4 flex flex-wrap gap-4"><legend className="mb-2 text-sm">Player statistics to display</legend>{(["kills", "damage", "assists", "knocks", "survivalTime"] as const).map(key => <label key={key} className="flex gap-2 text-sm"><input type="checkbox" checked={!template.hiddenStats?.includes(key)} onChange={event => update({ hiddenStats: event.target.checked ? (template.hiddenStats ?? []).filter(value => value !== key) : [...template.hiddenStats ?? [], key] })} />{BROADCAST_LABELS[key]}</label>)}</fieldset></details>
      <details>
          <summary className="cursor-pointer text-sm">Images, crop and safe area</summary>
          <div className="mt-3 space-y-4">
            {(
              [
                ["logoUrl", "Event / scene logo"],
                ["backgroundUrl", "Background image"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm">
                  {label} from event library
                  <select
                    className="input-esports"
                    value={library.some((asset) => asset.url === template[key]) ? template[key] : ""}
                    onChange={(event) => update({ [key]: event.target.value })}
                  >
                    <option value="">Default / choose upload below</option>
                    {library.map((asset) => (
                      <option key={asset.id} value={asset.url}>
                        {asset.name || asset.kind}
                      </option>
                    ))}
                  </select>
                </label>
                <FileUpload
                  type="media_asset"
                  entityId={`broadcast-${state.tournamentId}-${state.graphic}-${key}`}
                  label={label}
                  currentUrl={template[key]}
                  onUploaded={(url) => update({ [key]: url })}
                />
              </div>
            ))}
            {(
              [
                ["portraitX", "Portrait horizontal position", 0, 100],
                ["portraitY", "Portrait vertical position", 0, 100],
                ["backgroundX", "Background horizontal position", 0, 100],
                ["backgroundY", "Background vertical position", 0, 100],
                ["safeMargin", "Safe-area margin", 32, 96],
                ["logoSize", "Logo size", 48, 140],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key} className="block text-sm">
                {label}: {template[key]}
                <input
                  className="w-full"
                  type="range"
                  min={min}
                  max={max}
                  value={template[key]}
                  onChange={(event) => update({ [key]: Number(event.target.value) })}
                />
              </label>
            ))}
            <p className="text-xs text-text-muted">
              Recommended: 1920×1080 backgrounds, 600×900 portraits, transparent PNG/WebP logos. Crop controls change presentation only.
            </p>
          </div>
        </details>
        <details>
          <summary className="cursor-pointer text-sm">Table, sponsors and animation</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              Rows per page
              <input
                className="input-esports"
                type="number"
                min={4}
                max={24}
                value={template.rows}
                onChange={(event) => {
                  const rows = Number(event.target.value);
                  if (rows >= 4 && rows <= 24) update({ rows });
                }}
              />
            </label>
            <fieldset>
              <legend className="text-sm">Show columns</legend>
              {["matches", "placementPoints", "killPoints", "kills", "wins"].map((column) => (
                <label key={column} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!template.hiddenColumns.includes(column)}
                    onChange={(event) =>
                      update({
                        hiddenColumns: event.target.checked
                          ? template.hiddenColumns.filter((key) => key !== column)
                          : [...template.hiddenColumns, column],
                      })
                    }
                  />
                  {column.replace(/([A-Z])/g, " $1")}
                </label>
              ))}
            </fieldset>
            <label className="flex gap-2 text-sm">
              <input type="checkbox" checked={template.showSponsors} onChange={(event) => update({ showSponsors: event.target.checked })} />
              Show assigned sponsors
            </label>
            <label>
              Sponsor position
              <select
                className="input-esports"
                value={template.sponsorPosition}
                onChange={(event) => update({ sponsorPosition: event.target.value })}
              >
                <option value="bottom">Bottom strip</option>
                <option value="top">Top strip</option>
              </select>
            </label>
            <label>
              Animation
              <select className="input-esports" value={template.animation} onChange={(event) => update({ animation: event.target.value })}>
                <option value="fade">Subtle fade</option>
                <option value="none">None</option>
              </select>
            </label>
            <label>
              Animation duration (milliseconds)
              <input
                className="input-esports"
                type="number"
                min={0}
                max={1000}
                value={template.duration}
                onChange={(event) => {
                  const duration = Number(event.target.value);
                  if (duration >= 0 && duration <= 1000) update({ duration });
                }}
              />
            </label>
          </div>
        </details>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => update(defaultBroadcastTemplate(state.graphic))}>
            Reset to default
          </button>
        </div>
        <details>
          <summary className="cursor-pointer text-sm">Reusable event presets</summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              Preset name
              <input className="input-esports" maxLength={100} value={presetName} onChange={(event) => setPresetName(event.target.value)} />
            </label>
            <button
              type="button"
              className="btn-secondary"
              disabled={!presetName.trim() || (state.presets?.length ?? 0) >= 30}
              onClick={() => {
                onChange({
                  ...state,
                  presets: [
                    ...(state.presets ?? []),
                    {
                      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
                      name: presetName.trim(),
                      tournamentId: state.tournamentId,
                      graphic: state.graphic,
                      template: { ...template },
                    },
                  ],
                });
                setPresetName("");
                setNotice("Preset added to the draft. Save preview or mark ready to persist it.");
              }}
            >
              Save as event preset
            </button>
            <label className="block text-sm">
              Apply saved preset
              <select
                className="input-esports"
                value=""
                onChange={(event) => {
                  const preset = state.presets?.find((row) => row.id === event.target.value);
                  if (preset) update(preset.template);
                }}
              >
                <option value="">Choose a preset (reusable across events)</option>
                {state.presets
                  ?.filter((preset) => preset.graphic === state.graphic)
                  .map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                      {preset.tournamentId === state.tournamentId ? " (this event)" : " (another event)"}
                    </option>
                  ))}
              </select>
            </label>
            {notice ? (
              <p role="status" className="text-xs">
                {notice}
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </details>
  );
}
