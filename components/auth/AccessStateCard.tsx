import BravoLogo from "@/components/ui/BravoLogo";
import Link from "next/link";

type AccessAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
  external?: boolean;
};

type AccessStateCardProps = {
  badge: string;
  title: string;
  description: string;
  actions?: AccessAction[];
};

function renderAction(action: AccessAction) {
  const className = action.tone === "primary" ? "btn-primary" : "btn-secondary";

  if (action.external) {
    return (
      <a key={`${action.href}-${action.label}`} href={action.href} target="_blank" rel="noreferrer" className={className}>
        {action.label}
      </a>
    );
  }

  return (
    <Link key={`${action.href}-${action.label}`} href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

export default function AccessStateCard({ badge, title, description, actions = [] }: AccessStateCardProps) {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(29,155,240,0.18),_transparent_30%),radial-gradient(circle_at_82%_20%,_rgba(255,106,0,0.16),_transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
          <div className="relative z-10 max-w-3xl">
            <div className="w-fit rounded-full border border-white/10 bg-white/5 p-3">
              <BravoLogo size={42} />
            </div>
            <span className="brand-badge mt-5 inline-flex">{badge}</span>
            <h1 className="hero-h1 mt-5">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">{description}</p>

            {actions.length > 0 ? <div className="mt-6 flex flex-wrap gap-3">{actions.map((action) => renderAction(action))}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
