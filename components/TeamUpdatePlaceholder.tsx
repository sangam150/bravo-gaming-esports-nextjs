"use client";

import { useState } from "react";

export default function TeamUpdatePlaceholder() {
  const [teamName, setTeamName] = useState("");
  const [slotNumber, setSlotNumber] = useState("1");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamName.trim()) {
      setMessage("Enter a team name to update.");
      return;
    }

    setMessage(`Placeholder update received for ${teamName} at slot ${slotNumber}.`);
    setTeamName("");
    setSlotNumber("1");
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Team Update</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Placeholder Team Editor</h2>
        </div>
      </div>

      <p className="mb-6 max-w-2xl text-slate-300">Use this placeholder panel to simulate updating a team slot. The form is for layout and future integration with your database or admin backend.</p>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <label className="grid gap-2 text-sm text-slate-200">
          Team Name
          <input
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="Enter team name"
            className="rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 text-white placeholder:text-slate-500 focus:border-bravoBlue focus:outline-none"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-200">
          Slot Number
          <select
            value={slotNumber}
            onChange={(event) => setSlotNumber(event.target.value)}
            className="rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 text-white focus:border-bravoBlue focus:outline-none"
          >
            {Array.from({ length: 16 }, (_, index) => index + 1).map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="rounded-full bg-bravoBlue px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90 sm:col-span-2">
          Update Team (Placeholder)
        </button>
      </form>

      {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
    </section>
  );
}
