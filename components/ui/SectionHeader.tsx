import Link from "next/link";
import { ReactNode } from "react";

export default function SectionHeader({
  title,
  linkLabel,
  linkHref,
  action,
}: {
  title: string;
  linkLabel?: string;
  linkHref?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="section-heading">{title}</h2>
      {linkLabel && linkHref ? (
        <Link
          href={linkHref}
          className="text-label font-semibold uppercase tracking-[0.1em] text-accent-blue hover:underline"
        >
          {linkLabel} {"->"}
        </Link>
      ) : null}
      {action}
    </div>
  );
}
