"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { DEFAULT_SCORING_RULES, TEAM_TIE_BREAKS, AWARD_CRITERIA } from "@/lib/scoring-rules";
import ScoringSequenceEditor from "./ScoringSequenceEditor";

export default function PointSystemManager({ onCreated }: { onCreated: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [killPoints, setKillPoints] = useState("1");
  const [placements, setPlacements] = useState("10, 6, 5, 4, 3, 2, 1, 1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rules, setRules] = useState(DEFAULT_SCORING_RULES);
  const inputClass = "mt-1 w-full rounded-md border border-white/15 bg-bg-primary px-3 py-2 text-white";
  return (
    <details className="esports-card p-5">
      <summary className="cursor-pointer font-semibold">Configure scoring</summary>
      <p className="my-3 text-sm text-text-muted">
        Create a new scoring version, then select it in the match editor. Existing results retain their rules. Unlisted placements receive
        zero points.
      </p>
      <form
        className="grid gap-4 md:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const values = placements.split(",").map((value) => value.trim());
            if (values.some((value) => !value)) throw new Error("Enter a point value for each listed placement.");
            await adminFetch("/api/admin/point-systems", {
              method: "POST",
              body: JSON.stringify({
                name,
                kill_points: Number(killPoints),
                placement_points: Object.fromEntries(values.map((value, index) => [String(index + 1), Number(value)])),
                rules_json: rules,
              }),
            });
            await onCreated();
            setMessage("Scoring version saved. Select it in the match editor and run Preview.");
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not save scoring.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="text-sm">
          Version name
          <input
            className={inputClass}
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bravo weekly v2"
          />
        </label>
        <label className="text-sm">
          Points per kill
          <input
            className={inputClass}
            required
            type="number"
            min="0"
            max="1000"
            step="0.01"
            value={killPoints}
            onChange={(event) => setKillPoints(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Placement points, from first place
          <input className={inputClass} required value={placements} onChange={(event) => setPlacements(event.target.value)} />
        </label>
        <div className="space-y-4 md:col-span-3"><ScoringSequenceEditor label="Team tie-breakers" choices={TEAM_TIE_BREAKS} value={rules.tieBreakers} onChange={tieBreakers => setRules({ ...rules, tieBreakers })} /><ScoringSequenceEditor label="Match MVP criteria" choices={AWARD_CRITERIA} value={rules.awardCriteria} onChange={awardCriteria => setRules({ ...rules, awardCriteria })} /><p className="text-xs text-text-muted">Current overall standings use the latest included published match’s saved tie-break version. A day/stage graphic uses only its selected period. Existing point totals are never rescored automatically.</p></div>
        <button className="btn-primary md:col-span-3" disabled={busy}>
          {busy ? "Saving…" : "Create scoring version"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-red-200" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-3 text-cyan-200" role="status">
          {message}
        </p>
      )}
    </details>
  );
}
