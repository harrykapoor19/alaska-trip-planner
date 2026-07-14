import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearSyncConfig,
  loadSyncConfig,
  pullTripState,
  pushTripState,
  saveSyncConfig,
  type SharedState,
  type SyncConfig,
} from "../lib/tripSync";

// Keeps the three *shared* slices (expenses, booking confirmations, day notes)
// in step with the group's Upstash blob. Packing is deliberately not here — it
// stays personal in localStorage.
//
// Design notes:
// - Server wins on conflict (last-write-wins is fine for 6 friends editing
//   occasionally — no CRDT).
// - Echo guard: we remember the exact JSON we last synced. The push effect only
//   fires when the local slices differ from that, so applying a pulled update
//   never bounces straight back as a write.
// - Poll only while the tab is visible (20s); also pull on regaining focus.

type Slices = Pick<SharedState, "expenses" | "confirmations" | "dayNotes">;

const META_KEY = "alaska.sync.meta"; // { updatedAt } — our base for staleness
const POLL_MS = 20_000;
const PUSH_DEBOUNCE_MS = 1500;

export type SyncStatus = "off" | "idle" | "syncing" | "error";

interface Args<E, C> {
  expenses: E[];
  setExpenses: (v: E[]) => void;
  confirmations: Record<string, C>;
  setConfirmations: (v: Record<string, C>) => void;
  dayNotes: Record<string, string>;
  setDayNotes: (v: Record<string, string>) => void;
}

function readBase(): number {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw).updatedAt as number) : 0;
  } catch {
    return 0;
  }
}
function writeBase(updatedAt: number) {
  localStorage.setItem(META_KEY, JSON.stringify({ updatedAt }));
}

export function useSharedTripState<E, C>(args: Args<E, C>) {
  const [config, setConfig] = useState<SyncConfig | null>(() =>
    loadSyncConfig(),
  );
  const [status, setStatus] = useState<SyncStatus>(config ? "idle" : "off");
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => readBase());

  // Latest slices, so callbacks/intervals never close over stale values.
  const slicesRef = useRef<Slices>({
    expenses: args.expenses,
    confirmations: args.confirmations,
    dayNotes: args.dayNotes,
  });
  slicesRef.current = {
    expenses: args.expenses as unknown[],
    confirmations: args.confirmations as Record<string, unknown>,
    dayNotes: args.dayNotes as Record<string, string>,
  };

  const baseRef = useRef<number>(readBase());
  const lastSyncedJsonRef = useRef<string>("");
  const hasPulledRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyServer = useCallback(
    (s: SharedState) => {
      args.setExpenses(s.expenses as E[]);
      args.setConfirmations(s.confirmations as Record<string, C>);
      args.setDayNotes(s.dayNotes);
      baseRef.current = s.updatedAt;
      writeBase(s.updatedAt);
      setLastSyncedAt(s.updatedAt);
      lastSyncedJsonRef.current = JSON.stringify({
        expenses: s.expenses,
        confirmations: s.confirmations,
        dayNotes: s.dayNotes,
      });
    },
    // setters from useState/useLocalStorage are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pull = useCallback(async () => {
    const cfg = loadSyncConfig();
    if (!cfg) return;
    try {
      setStatus("syncing");
      const server = await pullTripState(cfg.code);
      if (server.updatedAt > baseRef.current) applyServer(server);
      else if (!hasPulledRef.current) {
        // First pull and server has nothing newer — adopt current local as base.
        lastSyncedJsonRef.current = JSON.stringify(slicesRef.current);
      }
      hasPulledRef.current = true;
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [applyServer]);

  const push = useCallback(async () => {
    const cfg = loadSyncConfig();
    if (!cfg) return;
    const payload = slicesRef.current;
    try {
      setStatus("syncing");
      const result = await pushTripState(cfg, payload, baseRef.current);
      if (result.conflict) {
        applyServer(result.state); // someone beat us — take theirs
      } else {
        baseRef.current = result.state.updatedAt;
        writeBase(result.state.updatedAt);
        setLastSyncedAt(result.state.updatedAt);
        lastSyncedJsonRef.current = JSON.stringify(payload);
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [applyServer]);

  // Initial pull + polling while visible.
  useEffect(() => {
    if (!config) return;
    hasPulledRef.current = false;
    pull();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") pull();
    }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") pull();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [config, pull]);

  // Debounced push whenever local shared slices actually change vs last sync.
  useEffect(() => {
    if (!config || !hasPulledRef.current) return;
    const current = JSON.stringify({
      expenses: args.expenses,
      confirmations: args.confirmations,
      dayNotes: args.dayNotes,
    });
    if (current === lastSyncedJsonRef.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(push, PUSH_DEBOUNCE_MS);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [args.expenses, args.confirmations, args.dayNotes, config, push]);

  const connect = useCallback((cfg: SyncConfig) => {
    saveSyncConfig(cfg);
    // Fresh join: clear our base so the first pull always adopts the group's
    // current state rather than fighting it.
    baseRef.current = 0;
    writeBase(0);
    hasPulledRef.current = false;
    setConfig(cfg);
    setLastSyncedAt(0);
  }, []);

  const disconnect = useCallback(() => {
    clearSyncConfig();
    localStorage.removeItem(META_KEY);
    setConfig(null);
    setStatus("off");
  }, []);

  return { config, status, lastSyncedAt, connect, disconnect };
}
