const tiers = [
  { label: "Title Sponsors", items: ["kamaucha"], highlight: true },
  { label: "Platinum Sponsors", items: ["AORUS", "logitech G", "intel"] },
  { label: "Gold Sponsors", items: ["Red Bull", "coinbase", "monster"] },
  { label: "Community Partners", items: ["PUBG", "discord", "YouTube"] },
];

export default function SponsorStrip() {
  return (
    <section className="sponsor-strip mt-8 p-6">
      {tiers.map((tier) => (
        <div key={tier.label} className="mb-6 last:mb-0">
          <p className="text-center font-display text-label font-bold uppercase tracking-[0.12em] text-text-muted">{tier.label}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {tier.items.map((name) => (
              <span
                key={name}
                className={`rounded-card border px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition hover:border-accent-blue/40 ${
                  tier.highlight
                    ? "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
                    : "border-white/[0.08] bg-bg-primary text-text-muted hover:text-white"
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
