// Shared group state for the trip — the one piece of server that exists.
//
// The app is otherwise backend-less (see CLAUDE.md). This endpoint stores a
// single JSON blob per trip in Upstash Redis so the 6 travelers see the same
// expenses, booking confirmations, and day notes. Packing stays local, per
// device, on purpose (your gear list != mine).
//
// Auth model: a shared secret TRIP_CODE (you make it up, text it to the group).
// The client sends it on every call; we compare against the env var. There are
// no accounts — this is a trusted-friends "shared Google Doc", not a SaaS.
//
// Concurrency: last-write-wins with a staleness guard. The client sends the
// `updatedAt` it last saw; if the server has a newer write, we reject with 409
// and hand back the current state so the client adopts it instead of clobbering.
//
// Not covered by `tsc -b` (tsconfig only includes src/). Vercel compiles it
// with its own Node runtime; keep it self-contained and simple.

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// One trip. If this ever needs to host several, key by code instead of a const.
const KEY = (code: string) => `alaska:trip:${code}`;

interface SharedState {
  expenses: unknown[];
  confirmations: Record<string, unknown>;
  dayNotes: Record<string, string>;
  updatedAt: number;
  updatedBy: string;
}

const EMPTY: SharedState = {
  expenses: [],
  confirmations: {},
  dayNotes: {},
  updatedAt: 0,
  updatedBy: "",
};

export default async function handler(req: any, res: any) {
  const secret = process.env.TRIP_CODE;
  if (!secret) {
    res.status(500).json({ error: "TRIP_CODE not configured on the server" });
    return;
  }

  const code =
    req.method === "GET" ? req.query?.code : (req.body ?? {}).code;
  if (!code || code !== secret) {
    res.status(401).json({ error: "bad trip code" });
    return;
  }

  if (req.method === "GET") {
    const state = (await redis.get<SharedState>(KEY(code))) ?? EMPTY;
    res.status(200).json({ state });
    return;
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const incoming = body.state as Partial<SharedState> | undefined;
    const baseUpdatedAt = Number(body.baseUpdatedAt ?? 0);
    if (!incoming) {
      res.status(400).json({ error: "missing state" });
      return;
    }

    const current = (await redis.get<SharedState>(KEY(code))) ?? EMPTY;
    // Someone else wrote after the base this client last saw — refuse and
    // hand back the newer state so the client merges rather than overwrites.
    if (current.updatedAt > baseUpdatedAt) {
      res.status(409).json({ conflict: true, state: current });
      return;
    }

    const next: SharedState = {
      expenses: incoming.expenses ?? [],
      confirmations: incoming.confirmations ?? {},
      dayNotes: incoming.dayNotes ?? {},
      updatedAt: Date.now(),
      updatedBy: String(body.name ?? "someone"),
    };
    await redis.set(KEY(code), next);
    res.status(200).json({ state: next });
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}
