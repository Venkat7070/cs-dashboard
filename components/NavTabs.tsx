"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/breakdowns", label: "ARR Breakdowns" },
] as const;

export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border bg-panel/40">
      <div className="mx-auto flex max-w-[1400px] gap-1 px-4 sm:px-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "border-accent text-text" : "border-transparent text-text/50 hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
