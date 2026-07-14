import type { ReactNode } from "react";
import type { TabKey } from "../App";

interface Props {
  active: TabKey;
  onTab: (t: TabKey) => void;
  showToday: boolean;
  todayBadge?: string;
  bookingsDone: number;
  bookingsTotal: number;
  packedDone: number;
  packedTotal: number;
  syncPill?: ReactNode;
}

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: "today", label: "Today" },
  { key: "journey", label: "Journey" },
  { key: "days", label: "Days" },
  { key: "bookings", label: "Bookings" },
  { key: "budget", label: "Budget" },
  { key: "pack", label: "Pack" },
  { key: "contacts", label: "Contacts" },
];

export function Header({
  active,
  onTab,
  showToday,
  todayBadge,
  bookingsDone,
  bookingsTotal,
  packedDone,
  packedTotal,
  syncPill,
}: Props) {
  return (
    <header className="flex shrink-0 flex-col gap-1 border-b border-ink-200 bg-white px-3 pb-1 pt-2 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
      <div className="flex shrink-0 items-baseline gap-3 sm:gap-4">
        <h1 className="text-base font-semibold tracking-tight text-ink-900">
          Alaska 2026
        </h1>
        <div className="text-[11px] text-ink-500 sm:text-xs">
          Jun 25 – Jul 5  ·  6 travelers
        </div>
        <a
          href="?print"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-md border border-ink-200 px-2 py-0.5 text-[11px] font-medium text-ink-600 transition-colors hover:border-accent-400 hover:text-accent-700 sm:inline-block"
          title="Open a printable PDF packet"
        >
          PDF
        </a>
        {syncPill}
      </div>
      {/* Desktop tabs — mobile navigation lives in the bottom bar. */}
      <nav className="scroll-soft -mx-1 hidden flex-nowrap items-center gap-1 overflow-x-auto pb-1 lg:mx-0 lg:flex lg:flex-wrap lg:overflow-visible lg:pb-0">
        {TABS.map((t) => {
          if (t.key === "today" && !showToday) return null;
          const isActive = t.key === active;
          let label: string = t.label;
          if (t.key === "bookings")
            label = `Bookings ${bookingsDone}/${bookingsTotal}`;
          if (t.key === "pack")
            label = `Pack ${packedDone}/${packedTotal}`;

          return (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              className={
                "shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors " +
                (isActive
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100")
              }
            >
              <span>{label}</span>
              {t.key === "today" && todayBadge && (
                <span
                  className={
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " +
                    (isActive
                      ? "bg-white/20 text-white"
                      : "bg-accent-100 text-accent-700")
                  }
                >
                  {todayBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
