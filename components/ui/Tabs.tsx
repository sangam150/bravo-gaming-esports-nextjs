"use client";

import { useId, useRef, useState } from "react";

export default function Tabs({
  tabs,
  defaultTab,
  label = "Section tabs",
  barClassName,
  contentClassName,
  children,
}: {
  tabs: string[];
  defaultTab?: string;
  label?: string;
  barClassName?: string;
  contentClassName?: string;
  children: (activeTab: string) => React.ReactNode;
}) {
  const tabSetId = useId().replace(/:/g, "");
  const panelId = `${tabSetId}-panel`;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState(defaultTab && tabs.includes(defaultTab) ? defaultTab : (tabs[0] ?? ""));

  function selectTab(index: number) {
    const nextTab = tabs[index];
    if (!nextTab) return;
    setActive(nextTab);
    buttonRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (tabs.length === 0) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    selectTab(nextIndex);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className={["tab-bar", barClassName].filter(Boolean).join(" ")}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            id={`${tabSetId}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={active === tab}
            aria-controls={panelId}
            tabIndex={active === tab ? 0 : -1}
            onClick={() => setActive(tab)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={`tab-item ${active === tab ? "tab-item-active" : "hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${tabSetId}-tab-${Math.max(
          0,
          tabs.findIndex((tab) => tab === active),
        )}`}
        key={active}
        className={["tab-panel pt-6", contentClassName].filter(Boolean).join(" ")}
      >
        {children(active)}
      </div>
    </div>
  );
}
