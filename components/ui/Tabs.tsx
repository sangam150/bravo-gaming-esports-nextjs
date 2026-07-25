"use client";

import { useState } from "react";

export default function Tabs({
  tabs,
  defaultTab,
  barClassName,
  contentClassName,
  children,
}: {
  tabs: string[];
  defaultTab?: string;
  barClassName?: string;
  contentClassName?: string;
  children: (activeTab: string) => React.ReactNode;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]);
  return (
    <div>
      <div role="tablist" className={["tab-bar", barClassName].filter(Boolean).join(" ")}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active === tab}
            onClick={() => setActive(tab)}
            className={`tab-item ${active === tab ? "tab-item-active" : "hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={active} className={["tab-panel pt-6", contentClassName].filter(Boolean).join(" ")}>
        {children(active)}
      </div>
    </div>
  );
}
