"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Tabs from "@/components/ui/Tabs";
import type { Scrim } from "@/lib/types";

const weekdaySchedule = [
  { day: "Monday", map: "Rondo", time: "8:00 PM" },
  { day: "Tuesday", map: "Erangel", time: "8:00 PM" },
  { day: "Wednesday", map: "Miramar", time: "8:00 PM" },
  { day: "Thursday", map: "Taego", time: "8:00 PM" },
];

const weekendSchedule = [
  { day: "Saturday", map: "Rondo", time: "8:00 PM" },
  { day: "Saturday", map: "Erangel", time: "9:00 PM" },
  { day: "Saturday", map: "Miramar", time: "10:00 PM" },
  { day: "Saturday", map: "Taego", time: "11:00 PM" },
  { day: "Sunday", map: "Erangel (Final Clash)", time: "12:00 AM" },
];

const pointSystem = [
  { place: "1st Place", pts: 10 },
  { place: "2nd Place", pts: 6 },
  { place: "3rd Place", pts: 4 },
  { place: "4th–8th", pts: 2 },
  { place: "9th–16th", pts: 0 },
  { place: "Each Kill", pts: 1 },
];

function SchedulePanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="esports-card p-6">
        <h3 className="section-heading mb-4">Weekdays</h3>
        <table className="data-table min-w-full">
          <tbody>
            {weekdaySchedule.map((r) => (
              <tr key={r.day}>
                <td className="font-display font-bold uppercase text-white">{r.day}</td>
                <td className="text-accent-blue">{r.map}</td>
                <td className="font-mono-stat text-text-muted">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="section-heading mb-4 mt-8">Weekends</h3>
        <table className="data-table min-w-full">
          <tbody>
            {weekendSchedule.map((r, i) => (
              <tr key={`${r.day}-${i}`}>
                <td className="font-display font-bold uppercase text-white">{r.day}</td>
                <td className="text-accent-blue">{r.map}</td>
                <td className="font-mono-stat text-text-muted">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="esports-card p-6">
        <h3 className="section-heading mb-4">Scrim Information</h3>
        <ul className="space-y-2 text-sm text-text-muted">
          <li>• 4 Matches Per Day (Weekdays)</li>
          <li>• 5 Matches Per Day (Weekends)</li>
          <li>• Squad Format</li>
          <li>• TPP Mode</li>
          <li>• Asia Server</li>
          <li>• Point System</li>
        </ul>
        <h3 className="section-heading mb-3 mt-8">Point System</h3>
        <table className="data-table min-w-full">
          <tbody>
            {pointSystem.map((p) => (
              <tr key={p.place}>
                <td className="text-text-muted">{p.place}</td>
                <td className="points-cell text-right">{p.pts} Points</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-text-muted">Total Points = Placement Points + Kill Points</p>
      </div>
    </div>
  );
}

function ResultsPanel() {
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scrims")
      .then((r) => r.json())
      .then((d) => setScrims(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="esports-card p-6 text-center text-text-muted">Loading scrim data...</div>;
  if (scrims.length === 0) {
    return (
      <div className="esports-card p-8 text-center text-text-muted">
        <p className="font-display font-bold uppercase text-white">Waiting for live match data</p>
        <p className="mt-2 text-sm">Scrim results appear after matches are completed and imported from the PUBG PC API.</p>
      </div>
    );
  }

  return (
    <div className="esports-card overflow-hidden !p-0">
      <table className="data-table min-w-full">
        <thead><tr><th>Date</th><th>Title</th><th>Map</th><th>Status</th><th>Match ID</th></tr></thead>
        <tbody>
          {scrims.map((s) => (
            <tr key={s.id}>
              <td>{s.date}</td>
              <td className="font-semibold text-white">{s.title}</td>
              <td className="text-accent-blue">{s.map}</td>
              <td>{s.status}</td>
              <td className="font-mono text-xs">{s.pubgMatchId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScrimsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="page-hero mb-8">
        <p className="section-title">PUBG PC</p>
        <h1 className="hero-h1 mt-2 !text-4xl">Daily Scrims</h1>
        <p className="mt-3 text-text-muted">Competitive scrim rooms with verified scoring and admin-reviewed leaderboards.</p>
      </div>

      <Tabs tabs={["Schedule", "Rules", "How to Join", "Results"]}>
        {(tab) => (
          <>
            {tab === "Schedule" && <SchedulePanel />}
            {tab === "Rules" && (
              <div className="esports-card p-6 text-sm text-text-muted">
                <p>• Teams must register before joining scrim lobbies.</p>
                <p className="mt-2">• Match IDs must be submitted within 30 minutes of completion.</p>
                <p className="mt-2">• Admin reviews all results before leaderboard updates.</p>
                <p className="mt-2">• Fair play policy — cheating results in permanent ban.</p>
              </div>
            )}
            {tab === "How to Join" && (
              <div className="esports-card p-6">
                <ol className="list-decimal space-y-3 pl-5 text-text-muted">
                  <li>Register your team at the registration page.</li>
                  <li>Join the Bravo Discord for lobby credentials.</li>
                  <li>Play scheduled scrims at listed times.</li>
                  <li>Submit match IDs to admins for verification.</li>
                </ol>
                <Link href="/teams/register" className="btn-primary mt-6 inline-flex">Register Team</Link>
              </div>
            )}
            {tab === "Results" && <ResultsPanel />}
          </>
        )}
      </Tabs>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-card border border-accent-blue/20 bg-accent-blue/5 p-6 sm:flex-row">
        <div>
          <h3 className="font-display text-lg font-bold uppercase text-white">Want to Play?</h3>
          <p className="text-sm text-text-muted">Register your team and compete in our daily scrims.</p>
        </div>
        <Link href="/teams/register" className="btn-primary">Join Scrims →</Link>
      </div>
    </main>
  );
}
