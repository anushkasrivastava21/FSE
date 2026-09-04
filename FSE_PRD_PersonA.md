# Person PRD — Vertical A: Listing & Matching Engine
## Blockchain Food Surplus Exchange (FSE)
Companion to the master FSE_PRD.md / FSE_TRD.md / FSE_TECHSTACK.md — this is your personal scope, full stack, top to bottom.

---

## 1. Your Mandate

You own the donor side of the exchange: how surplus gets listed, and how the "market" decides what gets matched to what, and when. This is the algorithmic core of the whole project — the urgency-score/time-decay function and the matching logic are the piece most worth showcasing at the viva.

## 2. What You Own

| Layer | Component | Phase |
|---|---|---|
| Contract | `Listing.sol` — create/cancel listing, status enum, expiry handling | 1 |
| Contract | `MatchingEngine.sol` — `computeUrgency()`, `matchOrders()`, emits `MatchExecuted` | 1 |
| Backend | Listing + matching indexer rows, `/listings` and `/matches/:id` endpoints | 2 |
| Backend | Urgency-cache job (recomputes display scores on a timer) | 2 |
| Backend | IPFS upload handling for listing photos | 2 |
| Frontend | Donor portal: wallet connect, "list surplus" form | 3 |
| Frontend | My listings view with live urgency score | 3 |
| Frontend | Match confirmation display (once matched) | 3 |

## 3. User Stories You're Responsible For

- As a donor, I list a batch (type, qty, expiry, quality, location) in under 60 seconds.
- As a donor, I see my listing's live urgency score so I know how soon it's likely to move.
- As a donor, I see when my listing is matched and to which region/NGO (NGO identity may be anonymized per policy — confirm with team).
- As any party, I can call `computeUrgency()` myself and verify why a match happened — the matching logic must be deterministic and publicly checkable, not a black box.

## 4. Urgency Score — Your Spec to Own

```
urgency(t) = base_priority(quality, quantity) × decay(expiry - t)
```

- `decay()` rises non-linearly as `expiry - t → 0` — mirrors options theta decay.
- Demand-side multiplier: urgency increases if multiple open NGO orders exist in the same region.
- MVP matching algorithm is greedy (sort by urgency, match oldest compatible order). If time allows, this is your best opportunity to extend it into a real bipartite-matching formulation (e.g. Hungarian algorithm) for a stronger technical contribution.

## 5. Dependencies

**You need from others (agree at Gate 0 — don't improvise later):**
- Nothing blocks your Phase 1 start — `Listing.sol` and `MatchingEngine.sol` have no upstream dependency.

**Others need from you:**
- **Person B** needs your `matchId` format/type (produced by `MatchExecuted`) before writing `Settlement.sol`, since a handoff can't be recorded without a valid match. Publish this interface by end of Week 1.
- **Person C**'s dashboard aggregates your `MatchExecuted` event (listing id, order id, urgency at match, timestamp) for the live ticker's "trade volume" stat. Publish the event schema at Gate 1, not later.

## 6. Definition of Done (per phase)

- **Phase 1 / Gate 1:** `Listing.sol` + `MatchingEngine.sol` pass unit tests (≥90% branch coverage), deployed to local network, ABI + events exported to `shared/abi/`, `matchId` format documented for B.
- **Phase 2 / Gate 2:** `/listings` and `/matches/:id` live against testnet contracts, OpenAPI spec published, urgency-cache job running on a timer, IPFS upload working end to end.
- **Phase 3 / Gate 3:** Donor portal fully functional on testnet — list, view live urgency, see match confirmation.

## 7. Your Timeline (mapped from master milestones)

| Week | You do |
|---|---|
| 1 | Gate 0 (joint) — repo scaffolding, publish `matchId` format |
| 2–3 | Write + unit test `Listing.sol`, `MatchingEngine.sol` |
| 4 | Gate 1 — deploy to testnet, freeze ABI/events |
| 5–6 | Build listing/matching backend + urgency cache job |
| 7 | Gate 2 — API live, spec frozen |
| 8–9 | Build donor portal frontend |
| 10 | Gate 3 — full flow demoable |
| 11–12 | Cross-vertical integration, testing, report, viva prep |

## 8. Tech Stack Quick Reference

Solidity ^0.8.24 + Hardhat + OpenZeppelin → Polygon Amoy testnet · NestJS + viem + Prisma + Supabase Postgres · Next.js + Tailwind + wagmi/RainbowKit + React Query. Full detail in FSE_TECHSTACK.md.
