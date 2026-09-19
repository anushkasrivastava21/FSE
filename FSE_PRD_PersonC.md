# Person PRD — Vertical C: Forecast Accuracy & Exchange Dashboard
## Blockchain Food Surplus Exchange (FSE)
Companion to the master FSE_PRD.md / FSE_TRD.md / FSE_TECHSTACK.md — this is your personal scope, full stack, top to bottom.

---

## 1. Your Mandate

You own the "analyst prediction" mechanic and the market's public face: NGO demand forecasts scored for accuracy after the fact, and the live ticker dashboard that shows listed surplus, active demand, and trade volume per region in real time. This is the piece that makes the exchange analogy visible and demoable — it's what an evaluator sees first.

## 2. What You Own

| Layer | Component | Phase |
|---|---|---|
| Contract | `ForecastRegistry.sol` — `submitForecast()`, `scoreForecast()`, accuracy history | 1 |
| Backend | Forecast scoring job (cron-triggered after each period closes) | 2 |
| Backend | Dashboard aggregation API — `/dashboard/ticker`, `/ngos/:address/accuracy` | 2 |
| Backend | WebSocket/Realtime channel powering live ticker updates | 2 |
| Frontend | Forecast submission UI (NGO-facing) | 3 |
| Frontend | Exchange Dashboard / live ticker (region filter, counters, recent trades) | 3 |
| Frontend | Admin panel (minimal MVP: pause/unpause, dispute note) | 3 |

## 3. User Stories You're Responsible For

- As an NGO, I pre-register a weekly demand forecast for my area.
- As an NGO, after the period ends, I see my Forecast Accuracy Score and history.
- As any user (donor, NGO, evaluator), I see a live dashboard: total listed, total demand, trade volume today, region breakdown, top NGOs by accuracy.
- As an admin, I can pause the system or leave a dispute note if something looks wrong.

## 4. Forecast Accuracy — Your Spec to Own

```
accuracyScore = clamp(100 - |expected - actual| / expected × 100, 0, 100)
```

Decide with the team at Gate 0 whether `actual` demand is derived automatically from matched/settled orders in that NGO's region during the period, or self-reported by the NGO — automatic derivation is more defensible for the viva but depends on A's and B's data being reliable by the time your scoring job runs.

## 5. Dependencies

**You need from others (agree at Gate 0 — don't improvise later):**
- **Person A**'s `MatchExecuted` event (listing/order ids, urgency, timestamp) — needed for both the ticker's trade-volume stat and (if auto-derived) forecast accuracy scoring.
- **Person B**'s `HandoffRecorded` and token-mint events — needed for the ticker's "delivered" stats and donor-side dashboard views.
- Because of this, your Phase 2/3 aggregation work naturally trails A's and B's same-phase output by roughly a day — plan for that in your own sprint, don't treat it as a blocker to raise late.

**Others need from you:**
- Nothing critical — `ForecastRegistry.sol` is largely self-contained. Your dashboard is a consumer of the whole system, not a dependency for anyone else's Phase 1 or 2.

## 6. Definition of Done (per phase)

- **Phase 1 / Gate 1:** `ForecastRegistry.sol` passes unit tests (≥90% branch coverage), deployed locally, ABI + events exported.
- **Phase 2 / Gate 2:** Forecast scoring job running against testnet contracts, `/dashboard/ticker` and `/ngos/:address/accuracy` live, real-time channel wired to A's and B's events (using their Gate-1 event schemas, even before their own Phase 2 is fully done, per §5).
- **Phase 3 / Gate 3:** Forecast submission UI, live ticker dashboard, and admin panel fully functional on testnet.

## 7. Your Timeline (mapped from master milestones)

| Week | You do |
|---|---|
| 1 | Gate 0 (joint) — repo scaffolding; get event schemas from A and B |
| 2–3 | Write + unit test `ForecastRegistry.sol` |
| 4 | Gate 1 — deploy to testnet, freeze ABI/events |
| 5–6 | Build forecast job + dashboard aggregation API + realtime channel |
| 7 | Gate 2 — API live, spec frozen (may trail A/B by ~1 day per §5) |
| 8–9 | Build forecast UI + live ticker dashboard + admin panel |
| 10 | Gate 3 — full flow demoable |
| 11–12 | Cross-vertical integration, testing, report, viva prep |

## 8. Tech Stack Quick Reference

Solidity ^0.8.24 + Hardhat + OpenZeppelin → Polygon Amoy testnet · NestJS + viem + Prisma + Supabase Postgres + Supabase Realtime (or WebSocket/Socket.IO) + BullMQ/Redis for the scoring cron · Next.js + Tailwind + Recharts for the ticker charts + React Query. Full detail in FSE_TECHSTACK.md.
