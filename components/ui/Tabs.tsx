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
      <div className={["tab-bar", barClassName].filter(Boolean).join(" ")}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`tab-item ${active === tab ? "tab-item-active" : "hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className={["pt-6", contentClassName].filter(Boolean).join(" ")}>{children(active)}</div>
    </div>
  );
}
