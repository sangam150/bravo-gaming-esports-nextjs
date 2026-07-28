"use client";

import BravoLogo from "@/components/ui/BravoLogo";
import { useEffect, useMemo, useRef, useState } from "react";

const sections = [
  { id: "dashboard", label: "Dashboard", group: "Overview" },
  { id: "registeredTeams", label: "Registered Teams", group: "Competition" },
  { id: "teams", label: "Team Records", group: "Competition" },
  { id: "players", label: "Players", group: "Competition" },
  { id: "playerTeamLinking", label: "Player-Team Linking", group: "Competition", platformAdminOnly: true },
  { id: "platformEvents", label: "Events Hub", group: "Competition" },
  { id: "tournaments", label: "Tournaments", group: "Competition" },
  { id: "seasons", label: "Seasons", group: "Competition" },
  { id: "scrims", label: "Scrim Days", group: "Competition" },
  { id: "matchManager", label: "Match Manager", group: "Results & Imports" },
  { id: "pubg", label: "PUBG Import", group: "Results & Imports" },
  { id: "pendingImports", label: "Pending Imports", group: "Results & Imports" },
  { id: "approvedImports", label: "Import History", group: "Results & Imports" },
  { id: "matches", label: "Statistics", group: "Results & Imports" },
  { id: "leaderboard", label: "Leaderboards", group: "Results & Imports" },
  { id: "registrations", label: "Registrations", group: "Operations" },
  { id: "teamRequests", label: "Team Requests", group: "Operations" },
  { id: "inbox", label: "Inbox", group: "Operations" },
  { id: "homepage", label: "Homepage", group: "Content" },
  { id: "news", label: "News", group: "Content" },
  { id: "media", label: "Media", group: "Content" },
  { id: "sponsors", label: "Sponsors", group: "Content" },
  { id: "announcements", label: "Announcements", group: "Content" },
  { id: "games", label: "Games", group: "Content" },
  { id: "footer", label: "Footer", group: "Content" },
  { id: "discordRoles", label: "Discord Mapping", group: "Access & Settings" },
  { id: "settings", label: "Settings & Audit", group: "Access & Settings" },
] as const;

const groupOrder = ["Overview", "Competition", "Results & Imports", "Operations", "Content", "Access & Settings"] as const;

export type AdminSection = (typeof sections)[number]["id"];
type AdminNavGroup = (typeof groupOrder)[number];

export const ADMIN_SECTION_ROUTES: Record<AdminSection, string> = {
  dashboard: "",
  registeredTeams: "registered-teams",
  teams: "teams",
  players: "players",
  playerTeamLinking: "player-team-linking",
  platformEvents: "events-hub",
  tournaments: "tournaments",
  seasons: "seasons",
  scrims: "scrims",
  matchManager: "match-manager",
  pubg: "pubg-import",
  pendingImports: "pending-imports",
  approvedImports: "import-history",
  matches: "statistics",
  leaderboard: "leaderboards",
  registrations: "registrations",
  teamRequests: "team-requests",
  inbox: "messages",
  homepage: "homepage",
  news: "news",
  media: "media",
  sponsors: "sponsors",
  announcements: "announcements",
  games: "games",
  footer: "footer",
  discordRoles: "discord-role-mappings",
  settings: "settings",
};

export function getAdminSectionLabel(section: AdminSection) {
  return sections.find((item) => item.id === section)?.label ?? "Dashboard";
}

function AdminNavigation({
  active,
  collapsed,
  openGroups,
  onChange,
  onToggleGroup,
  canManagePlatformAdmin,
}: {
  active: AdminSection;
  collapsed: boolean;
  openGroups: Set<AdminNavGroup>;
  onChange: (section: AdminSection) => void;
  onToggleGroup: (group: AdminNavGroup) => void;
  canManagePlatformAdmin: boolean;
}) {
  return (
    <nav aria-label="Admin navigation" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
      {groupOrder.map((group) => {
        const groupSections = sections.filter(
          (section) =>
            section.group === group && (!("platformAdminOnly" in section) || !section.platformAdminOnly || canManagePlatformAdmin),
        );
        if (groupSections.length === 0) return null;
        const isOpen = openGroups.has(group) || groupSections.some((section) => section.id === active);

        return (
          <section key={group}>
            {!collapsed ? (
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => onToggleGroup(group)}
                className="flex w-full items-center justify-between rounded-btn px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.16em] text-text-muted hover:bg-bg-hover hover:text-white"
              >
                <span>{group}</span>
                <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>
            ) : null}
            {(collapsed || isOpen) && (
              <div className="mt-1 space-y-0.5">
                {groupSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    title={collapsed ? section.label : undefined}
                    aria-current={active === section.id ? "page" : undefined}
                    onClick={() => onChange(section.id)}
                    className={`flex w-full items-center rounded-btn py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide transition ${
                      collapsed ? "justify-center px-2" : "px-3"
                    } ${active === section.id ? "bg-accent-blue text-white" : "text-text-muted hover:bg-bg-hover hover:text-white"}`}
                  >
                    {collapsed ? (
                      <span aria-hidden="true" className="text-[11px]">
                        {section.label
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </span>
                    ) : (
                      section.label
                    )}
                    {collapsed ? <span className="sr-only">{section.label}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  active,
  collapsed,
  mobile = false,
  openGroups,
  onChange,
  onToggleGroup,
  onClose,
  dataConnected,
  backendLabel,
  onLogout,
  adminEmail,
  canManagePlatformAdmin,
}: {
  active: AdminSection;
  collapsed: boolean;
  mobile?: boolean;
  openGroups: Set<AdminNavGroup>;
  onChange: (section: AdminSection) => void;
  onToggleGroup: (group: AdminNavGroup) => void;
  onClose?: () => void;
  dataConnected: boolean;
  backendLabel: string | null;
  onLogout?: () => void;
  adminEmail?: string;
  canManagePlatformAdmin: boolean;
}) {
  const isCollapsed = mobile ? false : collapsed;

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div className={`flex min-w-0 items-center ${isCollapsed ? "justify-center" : "gap-2"}`}>
          <BravoLogo size={36} />
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-xs font-bold uppercase text-white">Bravo Gaming</p>
              <p className="text-[10px] uppercase text-text-muted">Admin Console</p>
            </div>
          ) : null}
        </div>
        {mobile ? (
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={onClose}
            className="rounded-btn border border-white/10 px-3 py-2 text-sm text-text-muted hover:text-white"
          >
            Close
          </button>
        ) : null}
      </div>

      <AdminNavigation
        active={active}
        collapsed={isCollapsed}
        openGroups={openGroups}
        onChange={onChange}
        onToggleGroup={onToggleGroup}
        canManagePlatformAdmin={canManagePlatformAdmin}
      />

      <div className="space-y-3 border-t border-white/[0.08] pt-4">
        {!isCollapsed && adminEmail ? <p className="truncate text-[10px] text-text-muted">{adminEmail}</p> : null}
        <div
          title={isCollapsed ? (dataConnected ? (backendLabel ?? "Live data connected") : "Data connection unavailable") : undefined}
          className={`flex items-center gap-2 text-[10px] text-text-muted ${isCollapsed ? "justify-center" : ""}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${dataConnected ? "bg-accent-green" : "bg-accent-yellow"}`} />
          {!isCollapsed ? (dataConnected ? (backendLabel ?? "Live data connected") : "Data connection unavailable") : null}
        </div>
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            title={isCollapsed ? "Sign out" : undefined}
            className={`w-full rounded-btn border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-text-muted hover:bg-bg-hover hover:text-white ${
              isCollapsed ? "text-center" : "text-left"
            }`}
          >
            {isCollapsed ? "Exit" : "Sign Out"}
          </button>
        ) : null}
      </div>
    </>
  );
}

export default function AdminSidebar({
  active,
  onChange,
  dataConnected,
  dataBackend,
  onLogout,
  adminEmail,
  canManagePlatformAdmin,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  dataConnected: boolean;
  dataBackend?: string | null;
  onLogout?: () => void;
  adminEmail?: string;
  canManagePlatformAdmin: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<AdminNavGroup>>(() => new Set(groupOrder));
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const backendLabel = dataBackend ? `${dataBackend[0].toUpperCase()}${dataBackend.slice(1)} data connected` : null;
  const activeLabel = useMemo(() => getAdminSectionLabel(active), [active]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileDrawerRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
        return;
      }

      if (event.key !== "Tab" || !mobileDrawerRef.current) return;
      const focusableItems = Array.from(
        mobileDrawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((item) => item.offsetParent !== null);
      const firstItem = focusableItems[0];
      const lastItem = focusableItems.at(-1);
      if (!firstItem || !lastItem) return;

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function closeMobileNavigation(restoreFocus = true) {
    setMobileOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
    }
  }

  function toggleGroup(group: AdminNavGroup) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <>
      <div className="esports-card flex items-center justify-between gap-3 p-3 xl:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue">Admin</p>
          <p className="truncate font-display text-sm font-bold uppercase text-white">{activeLabel}</p>
        </div>
        <button
          ref={mobileMenuButtonRef}
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-admin-navigation"
          onClick={() => setMobileOpen(true)}
          className="rounded-btn border border-white/10 px-4 py-2 text-xs font-bold uppercase text-white"
        >
          Menu
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] xl:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => closeMobileNavigation()}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <aside
            ref={mobileDrawerRef}
            id="mobile-admin-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="esports-card absolute inset-y-3 left-3 flex w-[min(88vw,320px)] flex-col gap-4 overflow-hidden p-4 shadow-2xl"
          >
            <SidebarContent
              active={active}
              collapsed={false}
              mobile
              openGroups={openGroups}
              onChange={(nextSection) => {
                closeMobileNavigation(false);
                onChange(nextSection);
              }}
              onToggleGroup={toggleGroup}
              onClose={() => closeMobileNavigation()}
              dataConnected={dataConnected}
              backendLabel={backendLabel}
              onLogout={onLogout}
              adminEmail={adminEmail}
              canManagePlatformAdmin={canManagePlatformAdmin}
            />
          </aside>
        </div>
      ) : null}

      <aside
        className={`esports-card relative sticky top-4 hidden max-h-[calc(100vh-2rem)] shrink-0 flex-col gap-4 overflow-hidden p-4 transition-[width] xl:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand admin navigation" : "Collapse admin navigation"}
          className="absolute right-2 top-2 z-10 rounded-btn border border-white/10 bg-bg-secondary px-2 py-1 text-[10px] text-text-muted hover:text-white"
        >
          {collapsed ? "›" : "‹"}
        </button>
        <SidebarContent
          active={active}
          collapsed={collapsed}
          openGroups={openGroups}
          onChange={onChange}
          onToggleGroup={toggleGroup}
          dataConnected={dataConnected}
          backendLabel={backendLabel}
          onLogout={onLogout}
          adminEmail={adminEmail}
          canManagePlatformAdmin={canManagePlatformAdmin}
        />
      </aside>
    </>
  );
}
