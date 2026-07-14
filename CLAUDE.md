# CLAUDE.md

Guidance for Claude Code working in this repo. (Project overview & setup live in [README.md](README.md).)

## What this is
A static, backend-less SPA trip planner (Vite + React 18 + TS + Tailwind + React-Leaflet). All user edits persist to `localStorage`; there is no server or database — **except** one optional, opt-in serverless endpoint (`api/trip-state.ts`) for cross-device group sync, dormant unless `TRIP_CODE` + Upstash env vars are set. See README's "group sync & Gmail" section.

## Conventions & gotchas
- **The itinerary is data, not code.** Stops, days, bookings, budget, packing, and contacts all live in `src/data/`. Change trip content there — don't hardcode dates/places into components.
- **Type-check before pushing.** Run `npm run build` (it runs `tsc -b` then `vite build`); the build is the only gate, there are no tests.
- **Never commit PII.** `receipts/` (booking confirmations with names, payment & contact info) and `.vercel/` are gitignored on purpose. Keep them out of git.
- **`localStorage` keys are versioned** (e.g. `alaska.expenses.v2`, `alaska.v3.currentIndex`). Bump the key when a data shape changes so stale state is ignored and defaults/seeds reload — don't silently mutate an existing key's shape.
- **Booking status is derived, not toggled.** A booking shows as confirmed via its `confirmed` flag in `src/data/bookings.ts` (set from a reconciled receipt), not a per-device checkbox — keep it that single source of truth.

## Workflow
`main` is branch-protected. The owner pushes directly; contributors fork and open a PR. See README's Contributing section.
