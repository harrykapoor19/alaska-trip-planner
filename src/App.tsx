import { useEffect, useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { Header } from "./components/Header";
import { DetailCard } from "./components/DetailCard";
import { RouteTimeline } from "./components/RouteTimeline";
import { BookingsPanel, type BookingConfirmation } from "./components/BookingsPanel";
import { BudgetPanel, type Expense } from "./components/BudgetPanel";
import { PackingPanel } from "./components/PackingPanel";
import { TodayPanel } from "./components/TodayPanel";
import { DaysPanel } from "./components/DaysPanel";
import { ContactsPanel } from "./components/ContactsPanel";
import { BottomNav } from "./components/BottomNav";
import { StopSheet } from "./components/StopSheet";
import { STOPS } from "./data/stops";
import { BOOKINGS } from "./data/bookings";
import { PACKING } from "./data/packing";
import { PRETRIP } from "./data/pretrip";
import { SEED_EXPENSES } from "./data/seedExpenses";
import { useStepNavigation } from "./hooks/useStepNavigation";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTripDate } from "./hooks/useTripDate";
import { useSharedTripState } from "./hooks/useSharedTripState";
import { GroupSyncSetup, GroupSyncPill } from "./components/GroupSync";

export type TabKey =
  | "today"
  | "journey"
  | "days"
  | "bookings"
  | "budget"
  | "pack"
  | "contacts";

export default function App() {
  const trip = useTripDate();

  // v3 = Homer-first itinerary
  const [currentIndex, setCurrentIndex] = useLocalStorage<number>(
    "alaska.v3.currentIndex",
    0,
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);

  // Smart default tab: Today if trip is active or starting in <30 days, else Journey
  const initialTab: TabKey = useMemo(() => {
    if (trip.phase === "during") return "today";
    if (trip.phase === "before" && trip.daysUntilTrip <= 30) return "today";
    if (trip.phase === "after") return "today";
    return "journey";
  }, [trip.phase, trip.daysUntilTrip]);

  const [tab, setTab] = useState<TabKey>(initialTab);

  const [packed, setPacked] = useLocalStorage<Record<string, boolean>>(
    "alaska.packed",
    {},
  );
  const [preReady, setPreReady] = useLocalStorage<Record<string, boolean>>(
    "alaska.preReady",
    {},
  );
  const [confirmations, setConfirmations] = useLocalStorage<
    Record<string, BookingConfirmation>
  >("alaska.confirmations", {});
  // v2 key so the receipt-seeded ledger loads (old empty "alaska.expenses" ignored).
  const [expenses, setExpenses] = useLocalStorage<Expense[]>(
    "alaska.expenses.v2",
    SEED_EXPENSES,
  );
  const [dayNotes, setDayNotes] = useLocalStorage<Record<string, string>>(
    "alaska.dayNotes",
    {},
  );

  // Group sync (opt-in): keeps expenses, confirmations, and day notes in step
  // with the other travelers via a shared Upstash blob. Packing stays local.
  const sync = useSharedTripState<Expense, BookingConfirmation>({
    expenses,
    setExpenses,
    confirmations,
    setConfirmations,
    dayNotes,
    setDayNotes,
  });
  // Show the "sync with the group?" prompt once, only if never seen and not
  // already connected. Skipping is remembered so it never nags.
  const [syncPromptSeen, setSyncPromptSeen] = useLocalStorage<boolean>(
    "alaska.sync.promptSeen",
    false,
  );
  const showSyncSetup = !sync.config && !syncPromptSeen;

  // Arrow-key navigation only matters in Journey + Days
  useStepNavigation({
    total: STOPS.length,
    current: currentIndex,
    setCurrent: setCurrentIndex,
  });

  // iOS: the keyboard overlays the layout viewport and only shrinks the
  // visual one, so a focused input near the bottom ends up hidden. Nudge it
  // into view once the keyboard has finished sliding in (~300ms). Clear any
  // pending nudge so rapid field-to-field taps don't over-scroll.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el.matches?.("input, textarea, select")) return;
      clearTimeout(timer);
      timer = setTimeout(
        () => el.scrollIntoView({ block: "nearest", behavior: "smooth" }),
        300,
      );
    };
    document.addEventListener("focusin", onFocusIn);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  // Esc closes the mobile route sheet.
  useEffect(() => {
    if (!routeOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRouteOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [routeOpen]);

  // Booking status is driven entirely by the `confirmed` flag (set from a
  // reconciled receipt) — no separate per-device toggle to drift out of sync.
  const bookingsDone = useMemo(
    () => BOOKINGS.filter((b) => b.confirmed).length,
    [],
  );
  const packedDone = useMemo(
    () => PACKING.filter((p) => packed[p.id]).length,
    [packed],
  );
  const preDone = useMemo(
    () => PRETRIP.filter((p) => preReady[p.id]).length,
    [preReady],
  );
  const outstanding = useMemo(
    () => BOOKINGS.reduce((sum, b) => sum + (b.balanceDueAmount ?? 0), 0),
    [],
  );
  // Amber dot on the More slot: something in there needs a look.
  const moreAttention = useMemo(() => {
    const unbooked = BOOKINGS.some((b) => b.priority <= 4 && !b.confirmed);
    const overdue = PRETRIP.some(
      (p) => p.deadline && p.deadline < trip.today && !preReady[p.id],
    );
    return unbooked || overdue || outstanding > 0;
  }, [trip.today, preReady, outstanding]);

  const current = STOPS[currentIndex];
  const prev = currentIndex > 0 ? STOPS[currentIndex - 1] : null;
  const next = currentIndex < STOPS.length - 1 ? STOPS[currentIndex + 1] : null;

  const todayBadge = useMemo(() => {
    if (trip.phase === "during") return "Now";
    if (trip.phase === "before") return `T-${trip.daysUntilTrip}`;
    return undefined;
  }, [trip.phase, trip.daysUntilTrip]);

  function jumpToStop(i: number) {
    setCurrentIndex(i);
    // Desktop keeps the split view, so highlighting in place is enough.
    // On mobile the map lives behind the Map tab — navigate so "show on
    // map" actually shows it.
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setTab("journey");
    }
  }

  // Mobile: the map only renders on the Map (journey) tab — every other
  // panel gets the full screen. Desktop keeps the persistent split.
  const mapVisibleMobile = tab === "journey";

  return (
    <div className="flex h-full flex-col bg-white">
      <Header
        active={tab}
        onTab={setTab}
        showToday={trip.phase !== "before" || trip.daysUntilTrip <= 60}
        todayBadge={todayBadge}
        bookingsDone={bookingsDone}
        bookingsTotal={BOOKINGS.length}
        packedDone={packedDone}
        packedTotal={PACKING.length}
        syncPill={
          sync.config ? (
            <GroupSyncPill
              name={sync.config.name}
              status={sync.status}
              lastSyncedAt={sync.lastSyncedAt}
              onDisconnect={sync.disconnect}
            />
          ) : null
        }
      />

      {showSyncSetup && (
        <GroupSyncSetup
          onConnect={(cfg) => {
            sync.connect(cfg);
            setSyncPromptSeen(true);
          }}
          onSkip={() => setSyncPromptSeen(true)}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Map: full-bleed on the mobile Map tab, left ~55% on desktop. */}
        <section
          className={
            // `isolate` keeps the in-map overlays (StopSheet / Route pill,
            // which sit at a high z-index to clear Leaflet) trapped in this
            // section's stacking context so they can't bleed over the bottom
            // nav or the More/Route sheets.
            "relative isolate border-b border-ink-200 lg:block lg:h-full lg:basis-[55%] lg:border-b-0 lg:border-r " +
            (mapVisibleMobile ? "block min-h-0 flex-1" : "hidden")
          }
        >
          <MapView
            stops={STOPS}
            currentIndex={currentIndex}
            hoveredIndex={hoveredIndex}
            onSelect={setCurrentIndex}
            onHover={setHoveredIndex}
            revision={tab}
          />
          <MapLegend />
          {mapVisibleMobile && (
            <>
              <button
                onClick={() => setRouteOpen(true)}
                className="absolute right-2 top-2 z-[1000] select-none rounded-full border border-ink-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-ink-700 shadow-sm backdrop-blur active:bg-ink-100 lg:hidden"
              >
                Route ↕
              </button>
              <StopSheet
                stop={current}
                prev={prev}
                next={next}
                onPrev={() => setCurrentIndex(currentIndex - 1)}
                onNext={() => setCurrentIndex(currentIndex + 1)}
                totalStops={STOPS.length}
              />
            </>
          )}
        </section>

        {/* Mobile route list — RouteTimeline in a slide-up sheet */}
        {routeOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
            <button
              aria-label="Close"
              onClick={() => setRouteOpen(false)}
              className="animate-fade absolute inset-0 bg-ink-900/50 active:bg-ink-900/60"
            />
            <div className="animate-sheet absolute inset-x-0 bottom-0 flex max-h-[70vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
              <div className="mx-auto mt-2 h-1 w-9 shrink-0 select-none rounded-full bg-ink-200" />
              <RouteTimeline
                stops={STOPS}
                currentIndex={currentIndex}
                hoveredIndex={hoveredIndex}
                onSelect={(i) => {
                  setCurrentIndex(i);
                  setRouteOpen(false);
                }}
                onHover={setHoveredIndex}
              />
            </div>
          </div>
        )}

        {/* Panel: full screen on mobile (hidden behind the map on the Map
            tab), right ~45% on desktop */}
        <section
          className={
            "min-h-0 flex-1 flex-col lg:flex lg:h-full lg:basis-[45%] " +
            (tab === "journey" ? "hidden" : "flex")
          }
        >
          {tab === "today" && (
            <TodayPanel
              trip={trip}
              packed={packed}
              preReady={preReady}
              onJumpToStop={jumpToStop}
              onGoToTab={(t) => setTab(t as TabKey)}
            />
          )}
          {tab === "journey" && (
            <>
              <DetailCard
                stop={current}
                prev={prev}
                next={next}
                onPrev={() => setCurrentIndex(currentIndex - 1)}
                onNext={() => setCurrentIndex(currentIndex + 1)}
                totalStops={STOPS.length}
              />
              <RouteTimeline
                stops={STOPS}
                currentIndex={currentIndex}
                hoveredIndex={hoveredIndex}
                onSelect={setCurrentIndex}
                onHover={setHoveredIndex}
              />
            </>
          )}
          {tab === "days" && (
            <DaysPanel
              trip={trip}
              notes={dayNotes}
              setNotes={setDayNotes}
              onJumpToStop={jumpToStop}
            />
          )}
          {tab === "bookings" && (
            <BookingsPanel
              confirmations={confirmations}
              setConfirmations={setConfirmations}
            />
          )}
          {tab === "budget" && (
            <BudgetPanel expenses={expenses} setExpenses={setExpenses} />
          )}
          {tab === "pack" && (
            <PackingPanel
              packed={packed}
              onTogglePack={(id) => setPacked({ ...packed, [id]: !packed[id] })}
              preReady={preReady}
              onTogglePre={(id) =>
                setPreReady({ ...preReady, [id]: !preReady[id] })
              }
              today={trip.today}
            />
          )}
          {tab === "contacts" && (
            <ContactsPanel
              today={trip.phase === "during" ? trip.today : undefined}
            />
          )}
        </section>
      </main>

      <BottomNav
        active={tab}
        onTab={setTab}
        todayBadge={todayBadge}
        bookingsDone={bookingsDone}
        bookingsTotal={BOOKINGS.length}
        preDone={preDone}
        preTotal={PRETRIP.length}
        packedDone={packedDone}
        packedTotal={PACKING.length}
        outstanding={outstanding}
        attention={moreAttention}
      />
    </div>
  );
}

function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 hidden rounded-lg border border-ink-200 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur sm:block lg:bottom-4 lg:left-4 lg:px-3 lg:py-2">
      <div className="mb-1 font-semibold uppercase tracking-wide text-ink-500">
        Route
      </div>
      <div className="flex items-center gap-3">
        <LegendLine kind="solid" color="#3b82f6" label="Visited" />
        <LegendLine kind="dashed" color="#cbd5e1" label="Upcoming" />
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-ink-600">
        <span className="inline-flex items-center gap-1">
          <Dot color="#34d399" />
          Drive
        </span>
        <span className="inline-flex items-center gap-1">
          <Dot color="#a78bfa" />
          Fly
        </span>
        <span className="inline-flex items-center gap-1">
          <Dot color="#fb923c" />
          Bus
        </span>
        <span className="inline-flex items-center gap-1">
          <Dot color="#38bdf8" />
          Boat
        </span>
      </div>
      <div className="mt-1 hidden text-[10px] text-ink-400 lg:block">← → arrow keys to step</div>
    </div>
  );
}

function LegendLine({
  kind,
  color,
  label,
}: {
  kind: "solid" | "dashed";
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-700">
      <svg width="22" height="4" viewBox="0 0 22 4">
        {kind === "solid" ? (
          <line x1="0" y1="2" x2="22" y2="2" stroke={color} strokeWidth="2" />
        ) : (
          <line
            x1="0"
            y1="2"
            x2="22"
            y2="2"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="3 3"
          />
        )}
      </svg>
      {label}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ background: color }}
    />
  );
}
