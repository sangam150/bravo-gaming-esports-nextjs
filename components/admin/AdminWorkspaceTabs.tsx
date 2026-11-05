"use client";
import { getAdminWorkspace, type AdminSection, type AdminTool } from "@/lib/admin-navigation";

export default function AdminWorkspaceTabs({
  section,
  onChange,
  canManagePlatformAdmin,
}: {
  section: AdminSection;
  onChange: (section: AdminSection) => void;
  canManagePlatformAdmin: boolean;
}) {
  const workspace = getAdminWorkspace(section);
  const tools = workspace.tools.filter((tool) => !tool.platformAdminOnly || canManagePlatformAdmin);
  const primary = tools.filter((tool) => !tool.advanced);
  const advanced = tools.filter((tool) => tool.advanced);
  if (!tools.length) return null;
  function button(tool: AdminTool) {
    return (
      <button
        key={tool.id}
        type="button"
        aria-current={section === tool.id ? "page" : undefined}
        onClick={() => onChange(tool.id)}
        className={`rounded-btn px-4 py-2 text-sm font-semibold ${section === tool.id ? "bg-accent-blue text-white" : "text-text-muted hover:bg-bg-hover hover:text-white"}`}
      >
        {tool.label}
      </button>
    );
  }
  return (
    <nav aria-label={`${workspace.label} tools`} className="flex flex-wrap items-start gap-2 border-b border-white/10 pb-3">
      {primary.map(button)}
      {advanced.length ? (
        <details key={workspace.id} className="relative" open={advanced.some((tool) => tool.id === section) || undefined}>
          <summary className="cursor-pointer rounded-btn px-4 py-2 text-sm text-text-muted">More tools</summary>
          <div className="flex flex-wrap gap-1 border-t border-white/10 pt-2">{advanced.map(button)}</div>
        </details>
      ) : null}
    </nav>
  );
}
