import { useState } from "react";
import { BOOKINGS } from "../data/bookings";
import { ActionLinks, PhoneIcon, formatPhone } from "./ActionLinks";
import { GmailBookingSearch } from "./GmailBookingSearch";

// The vendor name is the strongest search signal — take the contact string up
// to its separator ("Major Marine Tours · Harbor 360 dock"), else the booking
// name up to an em dash.
function vendorOf(contact: string, name: string): string {
  const fromContact = contact.split("·")[0].trim();
  if (fromContact) return fromContact;
  return name.split("—")[0].trim();
}

export interface BookingConfirmation {
  conf?: string;
  contactName?: string;
  time?: string;
}

interface Props {
  confirmations: Record<string, BookingConfirmation>;
  setConfirmations: (c: Record<string, BookingConfirmation>) => void;
}

export function BookingsPanel({ confirmations, setConfirmations }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function updateConf(id: string, patch: Partial<BookingConfirmation>) {
    setConfirmations({
      ...confirmations,
      [id]: { ...(confirmations[id] ?? {}), ...patch },
    });
  }

  const outstanding = BOOKINGS.reduce(
    (sum, b) => sum + (b.balanceDueAmount ?? 0),
    0,
  );

  return (
    <div className="scroll-soft h-full overflow-y-auto px-6 py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">
          Bookings
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Status comes from your confirmations. Tap a row to view details or
          jot a contact name.
        </p>
      </div>

      {outstanding > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              Balance still due
            </div>
            <div className="mt-0.5 text-[11px] text-ink-500">
              Talkeetna lodging + K2 flightseeing · plus the rental car at pickup
            </div>
          </div>
          <div className="text-xl font-semibold tabular-nums text-rose-700">
            ${outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {BOOKINGS.map((b) => {
          const isBooked = b.confirmed === true;
          const isExpanded = expandedId === b.id;
          const conf = confirmations[b.id] ?? {};
          const hasConf = !!(conf.conf || conf.contactName || conf.time);

          return (
            <li key={b.id}>
              <div
                className={
                  "rounded-xl border transition-colors " +
                  (isBooked
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/40")
                }
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0" aria-hidden>
                    <StatusDot confirmed={isBooked} />
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-ink-400">
                        {String(b.priority).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium text-ink-900">
                        {b.name}
                      </span>
                      {b.confirmed && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          confirmed
                        </span>
                      )}
                      {b.confirmed === false && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          to book
                        </span>
                      )}
                      {hasConf && (
                        <span className="rounded-full bg-accent-100 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
                          notes
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
                      <span>{b.date}</span>
                      <span className="text-ink-300">·</span>
                      <span className="font-medium text-ink-700">{b.price}</span>
                      <span className="text-ink-300">·</span>
                      <span>{b.contact}</span>
                    </div>
                    {b.notes && !isExpanded && (
                      <p className="mt-1 text-xs italic text-ink-500">
                        {b.notes}
                      </p>
                    )}
                  </button>
                  {b.phone && (
                    <a
                      href={`tel:${b.phone}`}
                      title={`Call ${formatPhone(b.phone)}`}
                      className="mt-0.5 shrink-0 rounded-md border border-ink-200 bg-white p-2 text-ink-600 transition-colors hover:border-accent-400 hover:text-accent-700"
                    >
                      <PhoneIcon />
                    </a>
                  )}
                  <Chevron expanded={isExpanded} />
                </div>

                {isExpanded && (
                  <div className="border-t border-ink-100 px-4 py-3">
                    <div className="mb-3">
                      <ActionLinks phone={b.phone} url={b.url} size="md" />
                    </div>

                    {(b.confRef || b.bookedBy || b.paid || b.balanceDue) && (
                      <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md bg-emerald-50/60 px-3 py-2 text-xs ring-1 ring-emerald-100">
                        {b.confRef && (
                          <Detail label="Confirmation" value={b.confRef} mono />
                        )}
                        {b.bookedBy && <Detail label="Booked by" value={b.bookedBy} />}
                        {b.paid && <Detail label="Paid" value={b.paid} />}
                        {b.balanceDue && (
                          <Detail label="Balance due" value={b.balanceDue} warn />
                        )}
                      </dl>
                    )}

                    {b.planB && (
                      <div className="mb-3 rounded-md bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
                        <span className="font-medium text-ink-700">Plan B: </span>
                        {b.planB}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Field
                        label="Confirmation #"
                        value={conf.conf ?? ""}
                        onChange={(v) => updateConf(b.id, { conf: v })}
                        placeholder="ABC-123456"
                        autoCapitalize="characters"
                        autoCorrect="off"
                      />
                      <Field
                        label="Contact person"
                        value={conf.contactName ?? ""}
                        onChange={(v) => updateConf(b.id, { contactName: v })}
                        placeholder="Name"
                        autoCapitalize="words"
                      />
                      <Field
                        label="Time / window"
                        value={conf.time ?? ""}
                        onChange={(v) => updateConf(b.id, { time: v })}
                        placeholder="08:30 or 'tide-dep'"
                        autoCapitalize="off"
                      />
                    </div>

                    <GmailBookingSearch
                      vendor={vendorOf(b.contact, b.name)}
                      onUse={(c) => updateConf(b.id, { conf: c })}
                    />

                    {b.notes && (
                      <p className="mt-3 text-xs italic text-ink-500">
                        {b.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </dt>
      <dd
        className={
          "mt-0.5 " +
          (mono ? "font-mono " : "") +
          (warn ? "font-medium text-rose-700" : "text-ink-800")
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoCapitalize,
  autoCorrect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: "off" | "characters" | "words" | "sentences";
  autoCorrect?: "on" | "off";
}) {
  return (
    <label className="block">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        className="mt-0.5 w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-200"
      />
    </label>
  );
}

// Read-only status indicator — confirmed (green check) vs to-book (amber ring).
function StatusDot({ confirmed }: { confirmed: boolean }) {
  return (
    <span
      title={confirmed ? "Confirmed" : "Not booked yet"}
      className={
        "flex h-5 w-5 items-center justify-center rounded-full border " +
        (confirmed
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-amber-400 bg-white text-amber-500")
      }
    >
      {confirmed ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5L20 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span className="text-xs font-bold leading-none">!</span>
      )}
    </span>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={
        "mt-1 shrink-0 text-ink-400 transition-transform " +
        (expanded ? "rotate-180" : "")
      }
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
