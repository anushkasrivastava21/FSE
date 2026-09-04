# Product Requirements Document (PRD)
## Blockchain Food Surplus Exchange (FSE)
**Version:** 1.0 · **Team size:** 3 · **Status:** Draft for kickoff

---

## 1. Problem & Vision

Surplus food from restaurants, caterers, hostels, and event kitchens goes to waste because donor→NGO matching today is manual, slow, and untrusted (no proof of delivery, no record of reliability). FSE reframes the donation pipeline as a stock exchange: donors "list" surplus like sellers list shares, NGOs "place orders" like buyers, a matching engine clears the market using an urgency score instead of price, and every trade settles on-chain with an immutable chain-of-custody record.

**Vision statement:** A trustless, auditable, real-time marketplace where surplus food is matched to need before it spoils, and every actor (donor, NGO, transporter) builds a verifiable reputation over time.

## 2. Goals

1. Let a donor list a food batch (type, qty, expiry, quality, pickup location) in under 60 seconds.
2. Let an NGO place a demand order (qty, urgency, location) and get auto-matched without manual intervention.
3. Compute an urgency/priority score that rises as expiry approaches (time-decay function), driving match order.
4. Record every handoff (donor → transporter → NGO → beneficiary) as an immutable, timestamped on-chain event.
5. Mint a non-transferable "Food Credit Token" (soulbound) per completed donation as permanent proof.
6. Let NGOs pre-register demand forecasts and generate a Forecast Accuracy Score after the fact.
7. Provide a live dashboard (the "ticker"): listed surplus, active demand, trade volume, per region.

## 3. Non-Goals (explicitly out of scope for MVP)

- No fiat/crypto payment rails — nothing is bought or sold for money.
- No cross-chain support at MVP; single L2 testnet only.
- No native mobile app — responsive web only.
- No AI-based food-quality image verification at MVP (manual/self-attested quality field, flagged as a stretch goal).
- No multi-language localization at MVP.

## 4. Personas

| Persona | Need | Primary actions |
|---|---|---|
| **Donor** (restaurant, hostel mess, event caterer) | Offload surplus responsibly, get proof of donation | List batch, confirm handoff |
| **NGO / Recipient org** | Reliable, fast access to nearby surplus | Register, place demand order, submit forecast, confirm receipt |
| **Transporter/Volunteer** | Clear pickup/drop instructions | Accept handoff leg, scan/confirm at each stage |
| **Beneficiary** (optional, phase 2) | Confirmation food reached end recipient | Final confirmation (can be NGO-proxied at MVP) |
| **Platform Admin** | Monitor market health, resolve disputes | Dashboard, manual override for stuck matches |

## 5. Feature List (mapped to the exchange analogy)

| # | Module | Stock market analogy | MVP? |
|---|---|---|---|
| 1 | Listing Module | IPO / sell order | Yes |
| 2 | Order Module | Buy order | Yes |
| 3 | Matching Engine | Exchange matching core | Yes |
| 4 | Settlement & Chain-of-Custody Ledger | T+1/T+2 settlement | Yes |
| 5 | Food Credit Token (soulbound) | Stock certificate | Yes |
| 6 | Forecast Accuracy Module | Analyst prediction scoring | Yes (simplified) |
| 7 | Exchange Dashboard / Ticker | Market ticker | Yes |
| 8 | Dispute resolution / admin override | Exchange circuit breaker | Stretch |
| 9 | Image-based quality verification | — | Stretch |

## 6. User Stories (MVP)

**Donor**
- As a donor, I connect my wallet and list a batch with type, quantity, expiry timestamp, quality tier, and pickup location, so NGOs can see it.
- As a donor, I can see the live urgency score of my own listing so I know how soon it's likely to move.
- As a donor, I receive an on-chain confirmation once a match is made and again once delivery is confirmed.

**NGO**
- As an NGO, I register my org (KYC-lite: name, area, contact) once, then place demand orders with quantity and urgency.
- As an NGO, I optionally pre-register a weekly demand forecast for my area.
- As an NGO, I get matched automatically to the nearest/soonest-expiring eligible listing.
- As an NGO, after the forecast period ends, I can see my Forecast Accuracy Score.

**Transporter**
- As a transporter, I see assigned handoff legs and mark pickup/drop as complete, each written as a ledger event.

**Admin**
- As an admin, I view the dashboard: total listed, total demand, trade volume, region breakdown, top NGOs by accuracy score.

## 7. Urgency Score — Product-Level Definition

Urgency score is the "price" of the market. Product-level formula (final tuning owned by smart contract lead, documented in TRD):

```
urgency(t) = base_priority(quality, quantity) × decay(expiry - t)
```

- `decay()` rises non-linearly as `expiry - t → 0` (mirrors options theta decay — near-expiry batches get priority).
- Demand-side multiplier: urgency increases if multiple NGOs in the same region have open orders (supply scarcity relative to local demand).
- The score must be **deterministic and on-chain-computable** so any party can verify why a match happened — this is the core "explainable matching" pitch for the viva.

## 8. Success Metrics

- % of listed batches matched before expiry (target ≥ 80% in pilot).
- Median time-to-match after listing (target < 30 min).
- % of matches with confirmed final delivery (target ≥ 90%).
- Forecast Accuracy Score adoption: % of NGOs submitting forecasts weekly.
- Dashboard load/update latency (target < 2s for ticker refresh).

## 9. Team Structure & Build Sequencing

3-person team. **No one is a permanent "contracts person," "backend person," or "frontend person."** Instead, ownership is split **vertically by feature**, so each person writes contract, backend, and frontend code for their own slice. Layer priority — **contracts → backend → frontend** — still holds, but it applies *per phase, across the whole team at once*, not per person for the whole project. In practice: all three people write contract code together in Phase 1, all three write backend code together in Phase 2, all three write frontend code together in Phase 3 — each on their own vertical.

### Feature verticals (one owner each, full-stack within it)

| Vertical | Owner | Scope (contract + backend + frontend, all three layers) |
|---|---|---|
| **A — Listing & Matching** | Person A | `Listing.sol`, `MatchingEngine.sol` (incl. urgency-score function); listing/matching API endpoints + indexer rows; donor listing UI + live urgency display |
| **B — Order, Settlement & Token** | Person B | `Order.sol`, `Settlement.sol`, `FoodCreditToken.sol`; order + handoff API endpoints; NGO order UI + chain-of-custody detail view |
| **C — Forecast & Dashboard** | Person C | `ForecastRegistry.sol`; forecast scoring job + dashboard/ticker aggregation API; forecast submission UI + live ticker dashboard + admin panel |

### Phase structure (this is where the layer priority still applies — as a team-wide rule, not a per-person one)

| Phase | Who's active | What everyone builds | Gate to exit |
|---|---|---|---|
| **Phase 0 — Shared core** | All three, together | Repo scaffolding, `shared/` types package skeleton, common enums/structs (`Status`, address roles), wallet auth pattern, DB schema baseline | Gate 0 |
| **Phase 1 — Contracts** | All three, in parallel, each on their own vertical's contract(s) | A writes `Listing`+`MatchingEngine`, B writes `Order`+`Settlement`+`Token`, C writes `ForecastRegistry` | Gate 1 |
| **Phase 2 — Backend** | All three, in parallel, each on their own vertical's API/indexer/jobs | Same three people, same verticals, now one layer up | Gate 2 |
| **Phase 3 — Frontend** | All three, in parallel, each on their own vertical's UI | Same verticals, top layer | Gate 3 |
| **Phase 4 — Integration & polish** | All three | Cross-vertical flows (e.g. a listing match triggering a dashboard update), bug bash, demo script | Final |

Because each person already knows their own contract's ABI and their own backend's API shape (they wrote both), the classic "backend waits on contracts, frontend waits on backend" bottleneck mostly disappears *within* a vertical — the wait only matters *across* verticals where one feature depends on another's data (see §10.2 for how that's handled).

## 10. Cross-Team Prerequisites — Read Before Any Code Is Written

This is the single most important section for avoiding merge conflicts and integration breakage on a 3-person project. **Do not start coding until every item below is agreed and written down.**

### 10.1 Decide before Day 1 (whole-team decision, 1 meeting)
1. **Monorepo vs polyrepo.** Recommendation: monorepo (pnpm workspaces or Turborepo) with packages: `contracts/`, `backend/`, `frontend/`, `shared/`. One repo means one source of truth for types and no version-mismatch hell between packages.
2. **Chain choice + network.** One L2 testnet only (see Tech Stack doc). Everyone uses the same RPC endpoint and the same test wallet funding process.
3. **Data model ownership.** Which fields live on-chain (immutable, gas-costly) vs off-chain (mutable, cheap) — decided once, in the TRD, not improvised per-PR. On-chain: IDs, quantities, timestamps, status enums, hashes. Off-chain: images, free-text descriptions, contact info, cached urgency scores for fast reads.
4. **Naming conventions locked:** entity names (`Listing`, `Order`, `Match`, `Handoff`, `ForecastEntry`) must be identical across Solidity structs, backend DB tables, and frontend TypeScript types — no renaming per layer.
5. **Branching strategy:** trunk-based, `main` protected, one feature branch per module (e.g. `contracts/matching-engine`, `backend/indexer`, `frontend/dashboard`), PR required to merge into `main`, no direct pushes.
6. **Definition of Done per module** — a module isn't "done," it's done-and-tested-and-documented (unit tests pass + README + ABI/OpenAPI updated).

### 10.2 Integration Gates (hard checkpoints — do not skip)

Gates are still **team-wide, layer-based checkpoints** — that part doesn't change. What changes is that each gate now closes for *all three verticals at once*, since all three people are working the same layer simultaneously.

| Gate | Trigger | What gets frozen | Who signs off |
|---|---|---|---|
| **Gate 0** | Kickoff | Repo structure, chain choice, data model split, naming conventions, `shared/` package skeleton | All 3, jointly |
| **Gate 1** | All three verticals' contracts pass unit tests on local Hardhat/Foundry network | ABIs, event signatures, struct layouts for **A, B, and C** | Each person signs off their own vertical; all 3 confirm no cross-vertical breakage before moving to Phase 2 |
| **Gate 2** | All three verticals' backend indexer + API pass integration tests against Gate-1 contracts on testnet | OpenAPI spec + WebSocket event schema for **A, B, and C** | Same — self-signed per vertical, team confirms integration |
| **Gate 3** | All three verticals' frontend consumes Gate-2 APIs end-to-end on testnet | Full user flows demoable | All 3 |

Nobody builds against a moving target: once a gate closes, changing your own vertical's public interface still requires a versioned update and a heads-up — now specifically to whichever teammate's vertical *reads* from yours (e.g. C's dashboard reads match data that A's Matching Engine emits), not to a "downstream layer owner" who no longer exists as a fixed role.

**Cross-vertical dependencies** (the one place layers can still block each other across people):
- C's dashboard needs A's `MatchExecuted` event and B's `HandoffRecorded` event to show live trade volume — so C's Phase 2/3 work on the *aggregation* parts of the dashboard trails A and B slightly within the same phase. This is expected and small (hours, not days) — flag it at Gate 1 planning, don't discover it mid-Phase-3.
- B's `Settlement.sol` needs to know a match exists before recording a handoff — so B's contract takes a `matchId` produced by A's `MatchingEngine.sol`. Agree on this interface (just the `matchId` type/format) at Gate 0, not improvised later.

### 10.3 Avoiding merge conflicts specifically
- **Shared types package** (`shared/types`) auto-generated, never hand-written twice: Solidity ABI → TypeChain → TypeScript types; OpenAPI spec → `openapi-typescript` → TypeScript types. Both backend and frontend import from `shared/`, so a contract or API change propagates as a type error at compile time instead of a silent bug.
- **One owner per file/module, now by vertical instead of by layer.** Person A owns `contracts/src/Listing.sol`, `contracts/src/MatchingEngine.sol`, `backend/src/listing/`, `backend/src/matching/`, `frontend/app/donor/` — across all three layers, top to bottom. Person B and C mirror this for their verticals. This actually reduces conflicts versus the old layer-split: two people are almost never editing the same file, because verticals rarely overlap, whereas two people both editing `backend/` (as under the old model) is exactly where conflicts used to cluster.
- **Env/config convention:** a single `.env.example` at repo root, contract addresses written to a generated `deployments/<network>.json` file everyone reads — nobody hardcodes an address.
- **Migrations:** each person adds only the tables/columns their vertical needs, in their own migration file, reviewed by whoever's vertical reads that data (e.g. C reviews any migration touching `matches_cache` or `handoffs`, since the dashboard aggregates both).
- **Shared lint/format config** (ESLint + Prettier + Solhint) committed at repo root with a pre-commit hook, so formatting noise never pollutes diffs.
- **Small, frequent PRs** over long-lived branches — anything untouched for >3 days gets rebased against `main` before it drifts further.

## 11. Milestones (suggested, adjust to your term calendar)

Every row below happens with **all three people active at once**, each on their own vertical (A/B/C), unless noted.

| Week | Milestone |
|---|---|
| 1 | Gate 0 (all 3 jointly): repo scaffolded, `shared/` skeleton, cross-vertical interfaces (e.g. `matchId` format) agreed |
| 2–3 | Phase 1: A builds `Listing`+`MatchingEngine`, B builds `Order`+`Settlement`+`Token`, C builds `ForecastRegistry` — in parallel, unit tested locally |
| 4 | Gate 1: all three contracts deployed to testnet; ABIs/events frozen |
| 5–6 | Phase 2: each person builds their vertical's backend (indexer rows, API endpoints, jobs) against their own Phase-1 contracts, in parallel |
| 7 | Gate 2: all three verticals' APIs live against testnet, OpenAPI frozen; C's dashboard-aggregation endpoints wire up A's and B's event data |
| 8–9 | Phase 3: each person builds their vertical's frontend against their own Phase-2 API, in parallel |
| 10 | Gate 3: full donor→NGO→delivery flow demoable end-to-end across all three verticals |
| 11 | Phase 4: cross-vertical integration polish, dispute/admin flows, bug bash |
| 12 | Testing, documentation, report writing, viva prep, demo rehearsal, buffer |

## 12. Risks & Assumptions

- **Assumption:** pilot uses testnet only — no real funds, no legal/food-safety liability handled on-chain (flagged clearly in the report as future work).
- **Risk:** gas costs for frequent urgency-score recomputation — mitigated by computing the score off-chain for display and only settling final match on-chain (documented trade-off in TRD).
- **Risk:** R2/R3 blocked waiting on R1 — mitigated by Gate 0 interface-first drafting and mock servers (see TRD §Parallelization).
- **Risk:** scope creep from stretch goals (image verification, cross-chain) — explicitly deferred, tracked separately, not pulled into MVP branches.
