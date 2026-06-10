import { ReactNode } from "react";

export default function PageHero({
  label,
  title,
  description,
  actions,
}: {
  label: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="page-hero mb-8">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,_rgba(0,180,255,0.06),_transparent_70%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="section-title">{label}</p>
          <h1 className="section-heading mt-3">{title}</h1>
          {description && <p className="mt-4 text-base text-slate-400 sm:text-lg">{description}</p>}
        </div>
        {actions && <div className="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">{actions}</div>}
      </div>
    </section>
  );
}
