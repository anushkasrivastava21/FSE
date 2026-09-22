# Person PRD — Vertical B: Order, Settlement & Food Credit Token
## Blockchain Food Surplus Exchange (FSE)
Companion to the master FSE_PRD.md / FSE_TRD.md / FSE_TECHSTACK.md — this is your personal scope, full stack, top to bottom.

---

## 1. Your Mandate

You own the NGO side of the exchange and the entire trust layer: demand orders, the chain-of-custody ledger (donor → transporter → NGO → beneficiary), and the soulbound Food Credit Token that's minted as permanent proof once delivery is confirmed. This is the part of the system that makes the "immutable, tamper-proof record" pitch real.

## 2. What You Own

| Layer | Component | Phase |
|---|---|---|
| Contract | `Order.sol` — place/cancel order, status enum | 1 |
| Contract | `Settlement.sol` — `recordHandoff()`, custody state machine | 1 |
| Contract | `FoodCreditToken.sol` — soulbound ERC-721, minted on delivery | 1 |
| Backend | Order indexer rows, `/orders` endpoint | 2 |
| Backend | `/handoffs` endpoint, custody-trail assembly | 2 |
| Backend | Token-mint listener (writes to `/tokens/:donorAddress`) | 2 |
| Frontend | NGO portal: registration, "place order" form | 3 |
| Frontend | Order status view | 3 |
| Frontend | Match/handoff detail view — full custody trail for a given match | 3 |
| Frontend | Donor's Food Credit Token history view | 3 |

## 3. User Stories You're Responsible For

- As an NGO, I register my org (name, area, contact) once, then place demand orders with quantity and urgency.
- As a transporter, I mark pickup/in-transit/delivered as complete, each written as a permanent ledger event.
- As a donor, once delivery is confirmed, I automatically receive a Food Credit Token as proof — I can view my full donation history.
- As any party, I can view the complete, immutable handoff trail for any given match.

## 4. Settlement State Machine — Your Spec to Own

`Status { PickedUp, InTransit, Delivered }` — each transition is one `recordHandoff(matchId, stage, actor)` call, append-only, no edits or deletes. `Delivered` triggers `FoodCreditToken.mint(donor, matchId, metadataURI)` automatically inside the same contract call — mint is only ever called by `Settlement.sol`, never directly.

## 5. Dependencies

**You need from others (agree at Gate 0 — don't improvise later):**
- **Person A**'s `matchId` format and the `MatchExecuted` event — `Settlement.sol` cannot record a handoff for a match that doesn't exist yet. Get this interface from A by end of Week 1, before you write `Settlement.sol`'s logic (you can still scaffold `Order.sol` and `FoodCreditToken.sol` in parallel without it).

**Others need from you:**
- **Person C**'s dashboard aggregates your `HandoffRecorded` event for the live ticker and your token-mint data for donor-side stats. Publish the event schema at Gate 1.

## 6. Definition of Done (per phase)

- **Phase 1 / Gate 1:** `Order.sol`, `Settlement.sol`, `FoodCreditToken.sol` pass unit tests (≥90% branch coverage), reentrancy guards + access control verified (only `Settlement` can call `mint`), deployed locally, ABI + events exported.
- **Phase 2 / Gate 2:** `/orders`, `/handoffs`, `/tokens/:donorAddress` live against testnet contracts, OpenAPI spec published.
- **Phase 3 / Gate 3:** NGO portal + custody detail view + token history view fully functional on testnet.

## 7. Your Timeline (mapped from master milestones)

| Week | You do |
|---|---|
| 1 | Gate 0 (joint) — repo scaffolding; get `matchId` format from A |
| 2–3 | Write + unit test `Order.sol`, `Settlement.sol`, `FoodCreditToken.sol` |
| 4 | Gate 1 — deploy to testnet, freeze ABI/events |
| 5–6 | Build order/handoff/token backend |
| 7 | Gate 2 — API live, spec frozen |
| 8–9 | Build NGO portal + custody trail + token history UI |
| 10 | Gate 3 — full flow demoable |
| 11–12 | Cross-vertical integration, testing, report, viva prep |

## 8. Tech Stack Quick Reference

Solidity ^0.8.24 + Hardhat + OpenZeppelin (`AccessControl`, `ReentrancyGuard`, ERC-721 base) → Polygon Amoy testnet · NestJS + viem + Prisma + Supabase Postgres · Next.js + Tailwind + wagmi/RainbowKit + React Query. Full detail in FSE_TECHSTACK.md.
