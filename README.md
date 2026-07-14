# Alaska 2026 — Trip Planner

A self-contained, offline-friendly trip planner for a ~11-day Alaska road trip
(**Jun 25 – Jul 5, 2026**). It's a single-page React app: an interactive map of
the route plus tabbed panels for the day-by-day plan, bookings, budget, packing,
and contacts. No backend, no accounts — all your edits (packing checkboxes,
expenses, notes) live in your browser via `localStorage`.

> Built for one specific trip, but easy to fork and retarget to your own — the
> whole itinerary is plain data under [`src/data/`](src/data).

## Features

- **Map** — Leaflet route with color-coded legs (drive / fly / bus / boat), click
  or arrow-key to step through stops.
- **Today** — context-aware home screen that shows a `T-minus` countdown before
  the trip and the live "what's now / next" view during it.
- **Journey** — stop-by-stop detail cards (Anchorage → Homer → Lake Clark →
  Seward → Kenai Fjords → Talkeetna → Denali → back to Anchorage).
- **Days** — hour-by-hour daily schedule with editable per-day notes.
- **Bookings** — every reservation with confirmation numbers and status.
- **Budget** — expense ledger (seeded from real receipts) with running totals.
- **Packing** — checklist split into pre-trip prep and gear to pack.
- **Contacts** — lodging, activity, and emergency numbers in one place.

Mobile-friendly (installable as a PWA) and includes a print/PDF view.

## Install it on your phone (recommended)

Open the deployed site in Safari (iOS) or Chrome (Android) **while online**,
then *Share → Add to Home Screen*. That installs it as a standalone app with:

- **Offline support** — the app shell, fonts, and a pre-warmed set of map
  tiles covering the whole route are cached by a service worker. Large parts
  of the drive have no cell signal; the app keeps working.
- A bottom tab bar (Today · Days · Map · More) sized for thumbs.

Do the install (and open the app once) on Wi-Fi **before** leaving — a first
visit can't happen offline.

### Simulate a trip day

Append `?d=YYYY-MM-DD` (and optionally `&t=HH:MM`) to the URL to preview the
during-trip Today view ahead of time, e.g. `/?d=2026-06-27&t=07:30` shows the
bear-flight morning.

## Tech stack

Vite · React 18 · TypeScript · Tailwind CSS · React-Leaflet ·
vite-plugin-pwa. No server.

## Run it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:lan      # same, exposed on your LAN (open it on your phone)
```

Build for production:

```bash
npm run build        # type-checks, then outputs to dist/
npm run preview      # serve the production build locally
```

## Optional: group sync & Gmail

Two opt-in features light up when you set env vars — both are off (and invisible)
by default, so the app stays fully local unless you turn them on.

**Group sync** — share the ledger, booking confirmations, and day notes across
the group (packing stays personal). Needs a serverless deploy (e.g. Vercel) plus:

| Env var | Where |
|---------|-------|
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | Auto-set when you add Upstash Redis via the Vercel Marketplace |
| `TRIP_CODE` | A shared secret you invent and text the group — gates access |

Each traveler picks their name + enters the code once. Polls every 20s while the
tab's open; last-write-wins with a staleness guard. See [`api/trip-state.ts`](api/trip-state.ts).

**Gmail booking search** — in an expanded booking, each person can connect their
*own* Gmail (read-only, client-side OAuth — no server ever sees the mail) and pull
their confirmation email for that vendor. Needs:

| Env var | Where |
|---------|-------|
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth client ID (Web). Public by design. |

See [`.env.example`](.env.example) for the full list.

## Make it your own

All trip content is data, not code — edit these and the UI follows:

| File | What it drives |
|------|----------------|
| [`src/data/stops.ts`](src/data/stops.ts) | Map markers + route legs |
| [`src/data/days.ts`](src/data/days.ts) | Hour-by-hour daily schedule |
| [`src/data/bookings.ts`](src/data/bookings.ts) | Reservations & confirmation #s |
| [`src/data/budget.ts`](src/data/budget.ts) · [`seedExpenses.ts`](src/data/seedExpenses.ts) | Budget config + starting ledger |
| [`src/data/packing.ts`](src/data/packing.ts) | Packing / prep checklist |
| [`src/data/contacts.ts`](src/data/contacts.ts) | Phone numbers & addresses |

## Contributing

`main` is protected — direct pushes are blocked, so changes come in via pull
request:

1. **Fork** this repo (top-right on GitHub).
2. Create a branch, commit your change, and push it to your fork.
3. Open a **pull request** back here.

That's it — no need to be added as a collaborator.
