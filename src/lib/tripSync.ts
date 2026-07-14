// Thin transport over the /api/trip-state endpoint. No React here — just fetch.

export interface SharedState {
  expenses: unknown[];
  confirmations: Record<string, unknown>;
  dayNotes: Record<string, string>;
  updatedAt: number;
  updatedBy: string;
}

export interface SyncConfig {
  name: string;
  code: string;
}

const CONFIG_KEY = "alaska.sync.config";

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(cfg: SyncConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearSyncConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

export async function pullTripState(code: string): Promise<SharedState> {
  const res = await fetch(`/api/trip-state?code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`pull failed: ${res.status}`);
  const json = await res.json();
  return json.state as SharedState;
}

export interface PushResult {
  conflict: boolean;
  state: SharedState;
}

export async function pushTripState(
  cfg: SyncConfig,
  state: Pick<SharedState, "expenses" | "confirmations" | "dayNotes">,
  baseUpdatedAt: number,
): Promise<PushResult> {
  const res = await fetch(`/api/trip-state`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: cfg.code,
      name: cfg.name,
      state,
      baseUpdatedAt,
    }),
  });
  if (res.status === 409) {
    const json = await res.json();
    return { conflict: true, state: json.state as SharedState };
  }
  if (!res.ok) throw new Error(`push failed: ${res.status}`);
  const json = await res.json();
  return { conflict: false, state: json.state as SharedState };
}
