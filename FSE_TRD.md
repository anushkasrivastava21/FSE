# Technical Requirements Document (TRD)
## Blockchain Food Surplus Exchange (FSE)
**Version:** 1.0 · Companion to FSE_PRD.md and FSE_TECHSTACK.md

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (R3)                            │
│   Donor Portal | NGO Portal | Live Ticker Dashboard | Wallet     │
└───────────────────────────┬───────────────────────────────────────┘
                             │ REST + WebSocket (OpenAPI-defined)
┌───────────────────────────▼───────────────────────────────────────┐
│                          BACKEND (R2)                             │
│  API Server ── Indexer/Listener ── Urgency Cache ── Forecast Job  │
│         │              │                                          │
│      Postgres      IPFS (images/receipts)                        │
└───────────────────────────┬───────────────────────────────────────┘
                             │ Ethers/viem (read + write via relayer)
┌───────────────────────────▼───────────────────────────────────────┐
│                     SMART CONTRACTS (R1)                          │
│  Listing.sol │ Order.sol │ MatchingEngine.sol │ Settlement.sol   │
│  FoodCreditToken.sol (soulbound) │ ForecastRegistry.sol          │
│                     — deployed on L2 testnet —                    │
└─────────────────────────────────────────────────────────────────┘
```

**Design principle:** on-chain = source of truth for state transitions and proof; off-chain = fast reads, search, and rich media. The backend never mutates state the chain doesn't already reflect — it indexes and caches.

## 2. On-chain vs Off-chain Data Split (binding decision — see PRD §10.1)

| Data | Location | Why |
|---|---|---|
| Listing id, donor address, qty, food-type code, expiry timestamp, quality tier (enum), location hash | On-chain | Needed for trustless matching + audit |
| Order id, NGO address, qty requested, urgency flag, location hash | On-chain | Same as above |
| Match result (listing id ↔ order id, timestamp, computed urgency score at match time) | On-chain | This is the "trade confirmation" |
| Chain-of-custody events (pickup, in-transit, delivered) | On-chain, one event per handoff | Immutable audit trail is the core value prop |
| Food Credit Token | On-chain (soulbound ERC-721, `_transfer` disabled) | Permanent proof of donation |
| Forecast entries + accuracy score | On-chain (numbers only) | Verifiable, disputes need it public |
| Free-text descriptions, photos, contact details, exact street address | Off-chain (Postgres + IPFS for media) | Cheap to store/update, no need for immutability, keeps gas low |
| Cached/display urgency score (recomputed every N seconds) | Off-chain, derived from on-chain inputs | Avoids paying gas on every re-render/tick |

## 3. Smart Contract Specification (Phase 1 — all three, one vertical each)

Ownership is by vertical, not by a dedicated "contracts person": **Person A** builds `Listing.sol` + `MatchingEngine.sol`, **Person B** builds `Order.sol` + `Settlement.sol` + `FoodCreditToken.sol`, **Person C** builds `ForecastRegistry.sol`. All three write Solidity in the same phase, in parallel.

### 3.1 Contracts

**`Listing.sol`**
- `createListing(foodType, quantity, expiryTimestamp, qualityTier, locationHash, metadataURI) → listingId`
- `cancelListing(listingId)` — donor only, before match
- State: `enum Status { Open, Matched, Settled, Expired, Cancelled }`
- Emits `ListingCreated`, `ListingCancelled`, `ListingExpired`

**`Order.sol`**
- `placeOrder(quantity, urgencyFlag, locationHash) → orderId`
- `cancelOrder(orderId)` — NGO only, before match
- Requires NGO to be registered (see `NGORegistry.sol` or a role mapping in this contract)
- Emits `OrderCreated`, `OrderCancelled`

**`MatchingEngine.sol`** — the exchange core
- `computeUrgency(listingId) → uint256` — pure/view function implementing the time-decay formula from PRD §7; deterministic, publicly callable so any party can verify a match
- `matchOrders()` — callable by anyone (or a keeper bot) to trigger matching for pending listings/orders; **no centralized authority decides matches** — this is the key defensible design point for the viva
- Matching algorithm (MVP, greedy): for each open listing sorted by `computeUrgency()` descending, match to the oldest compatible open order in the same region bucket with sufficient/partial quantity support
- Emits `MatchExecuted(listingId, orderId, urgencyScoreAtMatch, timestamp)`

**`Settlement.sol`** — chain-of-custody ledger
- `recordHandoff(matchId, stage, actor)` where `stage ∈ {PickedUp, InTransit, Delivered}`
- Each call appends an immutable event; final `Delivered` stage triggers `FoodCreditToken` mint
- Emits `HandoffRecorded(matchId, stage, actor, timestamp)`

**`FoodCreditToken.sol`** — soulbound ERC-721 (OpenZeppelin base, `_beforeTokenTransfer` reverts unless mint/burn)
- `mint(donor, matchId, metadataURI)` — called only by `Settlement.sol` on delivery confirmation
- Token metadata (off-chain JSON via IPFS) includes donor, NGO, quantity, food type, delivery timestamp

**`ForecastRegistry.sol`**
- `submitForecast(ngoAddress, period, expectedQuantity)`
- `scoreForecast(ngoAddress, period, actualQuantity) → accuracyScore` — called after period ends (keeper or admin-triggered), formula e.g. `100 - |expected - actual| / expected * 100`, clamped to [0,100]
- `getNGOAccuracyHistory(ngoAddress) → uint256[]`

### 3.2 Access Control
- `Ownable`/role-based (OpenZeppelin `AccessControl`) for admin-only functions (dispute override, pausing).
- Donor/NGO identity = wallet address; lightweight off-chain KYC (name, area, contact) stored in Postgres, linked by address — **not** on-chain, to avoid storing PII immutably.

### 3.3 Security Checklist (each vertical owner verifies their own contracts before Gate 1 sign-off)
- Reentrancy guards on any function moving state + emitting mint (`nonReentrant` from OpenZeppelin)
- Checks-effects-interactions ordering in `Settlement.sol`
- Integer overflow: Solidity ^0.8.x has built-in checks — confirm compiler version pinned
- Access control tested: only donor can cancel their own listing, only NGO can cancel their own order, only `Settlement` can call `FoodCreditToken.mint`
- Oracle/keeper trust: `matchOrders()` being publicly callable means front-running/gas-griefing should be considered — MVP mitigation is documented as a known limitation, not solved, unless time permits
- Test coverage target: ≥90% branch coverage via Hardhat/Foundry before Gate 1

### 3.4 Deliverables for Gate 1 sign-off
- Deployed contract addresses on testnet, written to `deployments/<network>.json`
- ABI files exported to `shared/abi/`
- Event schema documented in `shared/events.md`
- Unit test report

## 4. Backend Specification (Phase 2 — all three, same verticals as Phase 1)

Same three people, same A/B/C split, one layer up: whoever wrote a vertical's contract in Phase 1 writes that vertical's backend in Phase 2 — they already know their own ABI and events best.

### 4.1 Components
- **Indexer/Listener service** — subscribes to contract events (via WebSocket RPC or a service like Alchemy/The Graph subgraph), writes normalized rows into Postgres. This is what makes fast dashboard reads possible without hitting the chain per request.
- **API server** — REST endpoints (OpenAPI-documented) + WebSocket channel for live ticker updates.
- **Urgency cache job** — recomputes display urgency scores on a timer (e.g. every 30s) by calling the contract's `computeUrgency()` view function in batch, writes to Postgres for fast frontend reads.
- **Forecast scoring job** — cron-triggered, calls `scoreForecast()` after each period closes.
- **IPFS integration** — image/receipt uploads go to IPFS (via Pinata or web3.storage), CID stored in Postgres and referenced in on-chain `metadataURI` where relevant.
- **Relayer (optional, decide at Gate 1)** — if donors/NGOs shouldn't need gas/a wallet extension for MVP demo simplicity, a backend-held relayer wallet can submit transactions on their behalf (meta-transactions) — flag this as a design decision to make explicitly, not default silently into it, since it changes the trust model described in the PRD.

### 4.2 Core REST Endpoints (draft — finalize as OpenAPI spec at Gate 2)

| Method | Path | Purpose |
|---|---|---|
| POST | `/listings` | Proxy/relay a new listing (or return unsigned tx for user's wallet) |
| GET | `/listings?region=&status=` | List/filter listings for display |
| POST | `/orders` | Same pattern for NGO demand orders |
| GET | `/orders?region=&status=` | Filter orders |
| GET | `/matches/:id` | Match detail incl. custody trail |
| POST | `/handoffs` | Record a handoff stage (relayed or unsigned tx) |
| GET | `/dashboard/ticker?region=` | Aggregated live stats for the ticker |
| POST | `/forecasts` | NGO submits a forecast |
| GET | `/ngos/:address/accuracy` | Forecast accuracy history |
| GET | `/tokens/:donorAddress` | Donor's Food Credit Token history |

### 4.3 Database Schema (Postgres — off-chain mirror + extras)
- `listings_cache(listing_id PK, chain_status, food_type, quantity, expiry_ts, quality_tier, region, description, image_cid, cached_urgency, updated_at)`
- `orders_cache(order_id PK, chain_status, ngo_address, quantity, region, urgency_flag, updated_at)`
- `matches_cache(match_id PK, listing_id, order_id, urgency_at_match, tx_hash, matched_at)`
- `handoffs(id PK, match_id FK, stage, actor_address, tx_hash, recorded_at)`
- `ngo_profiles(address PK, name, region, contact, kyc_notes)`
- `forecasts(id PK, ngo_address, period_start, period_end, expected_qty, actual_qty, accuracy_score)`

All `*_cache` tables are **derived, rebuildable** from chain events — never treated as the source of truth. This matters for merge-conflict avoidance: if the indexer needs to be rebuilt, it re-syncs from chain, no manual data entry ever competes with it.

### 4.4 Handling cross-vertical dependencies (the only remaining blocking risk)

Because each person now writes their own vertical's contract, backend, and frontend, the old "backend waits on someone else's contracts" bottleneck is gone *within* a vertical. What remains is the small set of places where one vertical's Phase-2/3 work reads another vertical's Phase-1/2 output:

1. At **Gate 0**, all three agree on the exact shape of cross-vertical handoffs — just the field names/types, not the implementation: `matchId` format (A → B, B needs it in `Settlement.sol`), and the event names A and B emit that C's dashboard aggregates (`MatchExecuted`, `HandoffRecorded`).
2. Whoever *produces* the cross-vertical data publishes an **interface-only stub** (function signature or event schema, no logic) by end of Week 1, same as before — just scoped to the specific handoff, not their whole contract.
3. Whoever *consumes* it (mainly C's dashboard, occasionally B's `Settlement.sol` reading A's `matchId`) builds against that stub/mock until the real thing lands at the relevant Gate, then swaps it in — low-risk if the interface didn't change.
4. In practice this means C's Phase 2/3 work on dashboard *aggregation* trails A's and B's same-phase work by roughly a day, not a full phase — flag this in sprint planning rather than treating it as a surprise.

## 5. Frontend Specification (Phase 3 — all three, same verticals as Phases 1–2)

Same A/B/C split again, top layer: each person builds the UI for the vertical they've already built the contract and backend for.

### 5.1 Pages/Views
- **Landing / role selection** (Donor / NGO / Admin)
- **Donor portal:** wallet connect, "list surplus" form, my listings + their live urgency score, delivery confirmations, my Food Credit Tokens
- **NGO portal:** wallet connect + org profile, "place order" form, forecast submission, my accuracy score, order status
- **Exchange Dashboard (the ticker):** region filter, live counters (listed / demand / matches today), recent trade feed, top NGOs by accuracy
- **Match/handoff detail view:** full chain-of-custody trail for a given match, rendered from `handoffs`
- **Admin panel (minimal MVP):** pause/unpause, manual dispute note

### 5.2 State & Data Flow
- Wallet connection via wagmi + a connector (RainbowKit or ConnectKit)
- Server state (listings, orders, dashboard) via React Query, backed by the backend's REST/WebSocket API — **never call the chain directly from the frontend for reads**, only for the user's own signing actions, to keep one consistent read path
- Write actions (list, order, cancel) either (a) prompt the user's wallet directly if not using a relayer, or (b) POST to backend which relays — decided once at Gate 1 per §4.1

## 6. Testing Strategy

| Layer | Tooling | Coverage target |
|---|---|---|
| Contracts | Hardhat/Foundry unit + fork tests | ≥90% branches |
| Backend | Jest/Vitest integration tests against local Hardhat node + test DB | Core endpoints + indexer replay |
| Frontend | Playwright/Cypress e2e for the 3 core flows: list→match→deliver, order→forecast→score, dashboard live-update | Happy paths + 1 failure path each |
| Full system | One end-to-end scripted demo scenario run on testnet before viva | Manual, scripted |

## 7. Deployment & Environments

- **Local:** Hardhat/Anvil local chain, docker-compose for Postgres + backend, `next dev` for frontend.
- **Testnet (shared team environment):** one agreed L2 testnet (see Tech Stack doc), one shared RPC key, contract addresses published in `deployments/testnet.json`.
- **CI:** GitHub Actions — lint + test on every PR for each package independently (`contracts`, `backend`, `frontend`), so a frontend PR never gets blocked by an unrelated contract test failure.

## 8. Open Decisions to Close at Gate 0 (do not defer)
1. Relayer vs direct-wallet-signing for MVP demo (affects backend §4.1 and frontend §5.2 significantly).
2. Region bucketing method for matching — pincode prefix vs lat/long radius (affects contract `locationHash` design and matching query complexity).
3. Exact urgency-score constants (decay curve steepness) — R1 proposes, whole team reviews once against sample data before freezing.
4. Whether Forecast Registry scoring is triggered manually (admin button, simpler for demo) or via a scheduled job (more "real," more infra) for MVP.
