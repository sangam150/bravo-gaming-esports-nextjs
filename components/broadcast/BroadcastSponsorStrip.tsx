"use client";
import { useEffect, useState } from "react";
import type { BroadcastSnapshot } from "@/lib/broadcast";
import type { BroadcastClock } from "./BroadcastScenes";
import Asset from "./BroadcastAsset";
export default function BroadcastSponsorStrip({ sponsors, clock }: { sponsors: BroadcastSnapshot["sponsors"]; clock: BroadcastClock }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const tick = () => setElapsed(Math.max(0, performance.now() - clock.performance)); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, [clock]);
  if (!sponsors.length) return null;
  const durations = sponsors.map(row => Math.max(1, row.rotationSeconds ?? 10) * 1000);
  const cursor = (clock.epoch + elapsed) % durations.reduce((sum, value) => sum + value, 0);
  const index = durations.findIndex((_, position) => cursor < durations.slice(0, position + 1).reduce((sum, duration) => sum + duration, 0));
  const sponsor = sponsors[Math.max(0, index)];
  return <footer className={`scene-sponsors assignment-${sponsor.position ?? "bottom"}`} aria-label="Assigned event sponsor"><div key={sponsor.id}><Asset url={sponsor.logoUrl} name={sponsor.name} /><span>{sponsor.name}</span></div></footer>;
}
