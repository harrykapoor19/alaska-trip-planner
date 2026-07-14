import { useState } from "react";
import { gmailConfigured, requestGmailToken } from "../lib/gmailAuth";
import {
  bookingQuery,
  guessConfirmation,
  searchGmail,
  type GmailMatch,
} from "../lib/gmailSearch";

// Sits inside an expanded booking row. Lets the traveler connect their own
// Gmail and pull their confirmation email for THIS vendor. Nothing is written
// until they tap "Use this" — and what's written flows into the same synced
// confirmations state, so the group sees it once found.
export function GmailBookingSearch({
  vendor,
  onUse,
}: {
  vendor: string;
  onUse: (conf: string) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [matches, setMatches] = useState<GmailMatch[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!gmailConfigured()) return null;

  async function connect() {
    setError(null);
    setBusy(true);
    try {
      setToken(await requestGmailToken());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    if (!token) return;
    setError(null);
    setBusy(true);
    setMatches(null);
    try {
      const res = await searchGmail(token, bookingQuery(vendor));
      setMatches(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-accent-200 bg-accent-50/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-accent-700">
          Find in Gmail
        </div>
        {!token ? (
          <button
            onClick={connect}
            disabled={busy}
            className="rounded-md border border-accent-300 bg-white px-2.5 py-1 text-xs font-medium text-accent-700 hover:border-accent-400 disabled:opacity-50"
          >
            {busy ? "Connecting…" : "Connect Gmail"}
          </button>
        ) : (
          <button
            onClick={search}
            disabled={busy}
            className="rounded-md border border-accent-300 bg-white px-2.5 py-1 text-xs font-medium text-accent-700 hover:border-accent-400 disabled:opacity-50"
          >
            {busy ? "Searching…" : "Search my Gmail"}
          </button>
        )}
      </div>

      {!token && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
          Read-only, your inbox only. Token stays in this tab and never leaves
          your browser.
        </p>
      )}

      {error && <p className="mt-2 text-[11px] text-rose-600">{error}</p>}

      {matches && matches.length === 0 && (
        <p className="mt-2 text-[11px] text-ink-500">
          No matching emails found. Try the "Confirmation #" field above
          manually.
        </p>
      )}

      {matches && matches.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {matches.map((m) => {
            const open = expandedId === m.id;
            const guess = open
              ? guessConfirmation(m.subject + " " + m.snippet)
              : undefined;
            return (
              <li
                key={m.id}
                className="rounded-md border border-ink-200 bg-white"
              >
                <button
                  onClick={() => setExpandedId(open ? null : m.id)}
                  className="block w-full px-2.5 py-1.5 text-left"
                >
                  <div className="truncate text-xs font-medium text-ink-800">
                    {m.subject}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-ink-500">
                    <span className="truncate">{m.from}</span>
                    <span className="text-ink-300">·</span>
                    <span className="shrink-0">{shortDate(m.date)}</span>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-ink-100 px-2.5 py-2">
                    <p className="text-[11px] leading-relaxed text-ink-600">
                      {m.snippet}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ink-500">
                        {guess ? (
                          <>
                            Best guess:{" "}
                            <span className="font-mono text-ink-800">
                              {guess}
                            </span>
                          </>
                        ) : (
                          "No code detected"
                        )}
                      </span>
                      {guess && (
                        <button
                          onClick={() => onUse(guess)}
                          className="rounded-md bg-ink-900 px-2.5 py-1 text-[11px] font-medium text-white"
                        >
                          Use this
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function shortDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
