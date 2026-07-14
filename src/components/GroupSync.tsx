import { useState } from "react";
import { TRAVELER_NAMES } from "../data/budget";
import type { SyncConfig } from "../lib/tripSync";
import type { SyncStatus } from "../hooks/useSharedTripState";

// First-run prompt: "Sync with the group?" Pick your name + enter the trip
// code the group agreed on. Fully skippable — skip and the app behaves exactly
// as it always has (local-only), same localStorage keys.
export function GroupSyncSetup({
  onConnect,
  onSkip,
}: {
  onConnect: (cfg: SyncConfig) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");

  const canJoin = name.trim() !== "" && code.trim() !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onSkip} />
      <div className="animate-sheet relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-ink-200 bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">
          Sync with the group?
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Share expenses, booking confirmations, and day notes with the other
          travelers. Your packing list stays private on this device. Skip this
          and nothing changes — the app stays local-only.
        </p>

        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            Who are you?
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TRAVELER_NAMES.map((n) => (
              <button
                key={n}
                onClick={() => setName(n)}
                className={
                  "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                  (name === n
                    ? "border-accent-400 bg-accent-100 text-accent-700"
                    : "border-ink-200 text-ink-600 hover:border-ink-300")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            Trip code
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="the code someone texted you"
            autoCapitalize="off"
            autoCorrect="off"
            className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-200"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onSkip}
            className="rounded-md px-3 py-2 text-sm text-ink-500 hover:bg-ink-100"
          >
            Skip — stay local
          </button>
          <button
            disabled={!canJoin}
            onClick={() => onConnect({ name: name.trim(), code: code.trim() })}
            className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Join group
          </button>
        </div>
      </div>
    </div>
  );
}

// Small header pill: shows sync state + who you are, opens a disconnect popover.
export function GroupSyncPill({
  name,
  status,
  lastSyncedAt,
  onDisconnect,
}: {
  name: string;
  status: SyncStatus;
  lastSyncedAt: number;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);

  const dot =
    status === "error"
      ? "bg-rose-500"
      : status === "syncing"
        ? "bg-amber-400 animate-pulse"
        : "bg-emerald-500";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-600 hover:border-ink-300"
        title={
          status === "error"
            ? "Sync error — will retry"
            : lastSyncedAt
              ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
              : "Connecting…"
        }
      >
        <span className={"h-1.5 w-1.5 rounded-full " + dot} />
        {name}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-ink-200 bg-white p-3 text-xs shadow-lg">
          <div className="text-ink-600">
            Synced as <span className="font-medium text-ink-900">{name}</span>
          </div>
          <div className="mt-0.5 text-ink-400">
            {status === "error"
              ? "Connection issue — retrying"
              : lastSyncedAt
                ? `Updated ${new Date(lastSyncedAt).toLocaleTimeString()}`
                : "Connecting…"}
          </div>
          <button
            onClick={() => {
              onDisconnect();
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border border-ink-200 px-2 py-1.5 text-ink-600 hover:border-rose-300 hover:text-rose-600"
          >
            Disconnect from group
          </button>
        </div>
      )}
    </div>
  );
}
