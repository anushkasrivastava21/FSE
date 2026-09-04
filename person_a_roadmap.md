# 🗺️ Person A — Complete Roadmap
## Vertical: Listing & Matching Engine | FSE Blockchain Food Surplus Exchange

> **You own the algorithmic core of the project.** The urgency-score + matching engine is the most technically rich piece — the thing evaluators will ask about at the viva. Build it right.

---

## 📌 Your Scope at a Glance

| Layer | What you build |
|---|---|
| **Contract (Phase 1)** | `Listing.sol` + `MatchingEngine.sol` |
| **Backend (Phase 2)** | Listing/matching indexer, `/listings` + `/matches/:id` API, urgency-cache job, IPFS upload |
| **Frontend (Phase 3)** | Donor portal — wallet connect, list surplus form, live urgency view, match confirmation |

---

## 🏁 Phase 0 — Shared Setup (Week 1)
> ⚠️ **Done jointly with the whole team. Do not skip.**

### Tasks
- [ ] Attend kickoff meeting — agree on all Gate 0 decisions:
  - [ ] **Monorepo structure**: `pnpm workspaces + Turborepo`, packages: `contracts/`, `backend/`, `frontend/`, `shared/`
  - [ ] **Chain**: Polygon Amoy testnet — get faucet POL tokens for your test wallet
  - [ ] **Data model split**: on-chain vs off-chain (already decided in TRD §2)
  - [ ] **Naming locked**: `Listing`, `Order`, `Match`, `Handoff`, `ForecastEntry` — identical everywhere
  - [ ] **Branching strategy**: trunk-based, feature branches like `contracts/listing`, PRs required
  - [ ] **Relayer vs direct-wallet-signing** — decide now (affects your backend and frontend significantly)
  - [ ] **Region bucketing** — pincode prefix vs lat/long radius (affects `locationHash` design and match query)
  - [ ] **Urgency score constants** — propose your decay curve values; whole team reviews
- [ ] Scaffold monorepo, commit `.env.example`, configure ESLint + Prettier + Solhint + Husky pre-commit hook
- [ ] Create `shared/types` skeleton (entity interfaces: `Listing`, `Match`)
- [ ] **Publish `matchId` format/type** — Person B needs this before writing `Settlement.sol`. Agree and document by end of Week 1.
  - `matchId` suggestion: `uint256`, auto-incremented counter in `MatchingEngine.sol`, or `keccak256(listingId, orderId, block.timestamp)`
- [ ] Document the `MatchExecuted` event schema in `shared/events.md` (stub, even if contract isn't written yet)

### Gate 0 Deliverables ✅
- Repo live, everyone can `pnpm install` and run
- Naming conventions doc committed
- `matchId` format agreed and written down
- `.env.example` complete

---

## ⛓️ Phase 1 — Smart Contracts (Weeks 2–3 → Gate 1: Week 4)

### Your contracts: `Listing.sol` + `MatchingEngine.sol`

---

### 📄 `Listing.sol`

**Purpose:** Donors create and manage food surplus listings on-chain.

#### Functions to implement

```solidity
// Create a new listing — called by donor
function createListing(
    uint8  foodType,          // enum: Cooked, Raw, Packaged, etc.
    uint256 quantity,         // in kg or meals
    uint256 expiryTimestamp,  // Unix timestamp
    uint8  qualityTier,       // enum: High, Medium, Low
    bytes32 locationHash,     // keccak256(region/pincode)
    string  metadataURI       // IPFS CID for photos, description
) external returns (uint256 listingId);

// Cancel listing — donor only, only if Status == Open
function cancelListing(uint256 listingId) external;
```

#### State to track
```solidity
enum Status { Open, Matched, Settled, Expired, Cancelled }

struct ListingData {
    address donor;
    uint8   foodType;
    uint256 quantity;
    uint256 expiryTimestamp;
    uint8   qualityTier;
    bytes32 locationHash;
    string  metadataURI;
    Status  status;
    uint256 createdAt;
}

mapping(uint256 => ListingData) public listings;
uint256 public listingCount;
```

#### Events to emit
```solidity
event ListingCreated(uint256 indexed listingId, address indexed donor, uint256 expiryTimestamp);
event ListingCancelled(uint256 indexed listingId);
event ListingExpired(uint256 indexed listingId);
event ListingStatusUpdated(uint256 indexed listingId, Status newStatus);
```

#### Access control
- `cancelListing`: only `listings[listingId].donor == msg.sender`
- `updateStatus` (called by MatchingEngine): only `MatchingEngine` contract address (set in constructor or via role)

#### Security checklist before Gate 1
- [ ] `nonReentrant` on state-changing functions (OpenZeppelin `ReentrancyGuard`)
- [ ] Check `expiryTimestamp > block.timestamp` on create
- [ ] Only donor can cancel, only before match
- [ ] Compiler version pinned: `pragma solidity ^0.8.24;`
- [ ] No integer overflow risk — Solidity 0.8+ built-in

---

### ⚙️ `MatchingEngine.sol`

**Purpose:** The "exchange core" — computes urgency scores and executes matches. **This is your star piece.**

#### Functions to implement

```solidity
// Pure/view — deterministic, publicly callable for verification
function computeUrgency(uint256 listingId) public view returns (uint256 score);

// Trigger matching — callable by anyone (or keeper bot)
// No centralized authority — this is your viva talking point
function matchOrders() external;

// Internal helper
function _findBestOrder(uint256 listingId) internal view returns (uint256 orderId);
```

#### Urgency Score Formula (your spec to own)

```
urgency(t) = base_priority(quality, quantity) × decay(expiry - t)
```

**Suggested implementation:**

```solidity
function computeUrgency(uint256 listingId) public view returns (uint256) {
    ListingData memory l = IListing(listingAddress).getListing(listingId);
    
    // Base priority: quality tier (3=High, 2=Med, 1=Low) × normalized quantity
    uint256 base = uint256(l.qualityTier) * 100 + (l.quantity > 100 ? 100 : l.quantity);
    
    // Decay: rises non-linearly as expiry approaches (theta decay analogy)
    // If already expired or < 1 hour left → max decay multiplier
    uint256 timeLeft = l.expiryTimestamp > block.timestamp 
        ? l.expiryTimestamp - block.timestamp 
        : 0;
    
    uint256 decay;
    if (timeLeft == 0) {
        decay = 1000; // max urgency
    } else {
        // Non-linear: 10000 / timeLeft (in hours), capped
        decay = 10000 / (timeLeft / 3600 + 1);
    }
    
    return base * decay;
}
```

> 💡 **Viva upgrade (if time allows):** Replace greedy matching with bipartite matching (Hungarian algorithm off-chain, verify on-chain). This is a genuine technical contribution that differentiates your project.

#### Matching Algorithm (MVP — greedy)
1. Fetch all `Open` listings, sort by `computeUrgency()` descending
2. For each listing (highest urgency first):
   - Find oldest compatible open `Order` in same region with compatible quantity
   - If found: call `IListing.updateStatus(listingId, Matched)`, call `IOrder.updateStatus(orderId, Matched)`
   - Emit `MatchExecuted`
3. Partial quantity support: decide at Gate 0 — simpler for MVP to require qty match within a tolerance

#### Event to emit (Person C's dashboard and Person B's Settlement depend on this)
```solidity
event MatchExecuted(
    uint256 indexed matchId,
    uint256 indexed listingId,
    uint256 indexed orderId,
    uint256 urgencyScoreAtMatch,
    uint256 timestamp
);
```

#### Gate 1 requirements for `MatchingEngine.sol`
- [ ] `computeUrgency()` is pure/view — any party can call it
- [ ] `matchOrders()` is permissionless (or keeper-triggered — decide at Gate 0)
- [ ] Unit tests cover: urgency computation, greedy match selection, expired-listing edge case, no-match scenario, region mismatch
- [ ] ≥90% branch coverage

---

### 🧪 Testing (Hardhat)

Set up in `contracts/test/`:
```
test/
  Listing.test.ts       ← create, cancel, expiry edge cases
  MatchingEngine.test.ts ← urgency formula, match execution, no-match, cross-region rejection
```

**Key test cases to write:**
- [ ] `createListing` emits `ListingCreated` with correct args
- [ ] `cancelListing` fails if not donor
- [ ] `cancelListing` fails if already matched
- [ ] `computeUrgency` returns higher score for nearer expiry
- [ ] `computeUrgency` returns higher score for higher quality tier
- [ ] `matchOrders` matches highest-urgency listing first
- [ ] `matchOrders` skips region-mismatched orders
- [ ] `matchOrders` does nothing if no open orders exist

### 📦 Gate 1 Deliverables ✅
- [ ] Both contracts deployed to Polygon Amoy testnet
- [ ] Contract addresses in `deployments/testnet.json`
- [ ] ABIs exported to `shared/abi/Listing.json` + `shared/abi/MatchingEngine.json`
- [ ] TypeChain types generated into `shared/types/`
- [ ] `MatchExecuted` event schema in `shared/events.md`
- [ ] `matchId` format formally documented for Person B
- [ ] Unit test report (≥90% branch coverage)
- [ ] Brief README in `contracts/src/` explaining urgency formula

---

## 🖥️ Phase 2 — Backend (Weeks 5–6 → Gate 2: Week 7)

**Tech:** NestJS + viem + Prisma + Supabase Postgres + BullMQ/Redis

### Module structure (NestJS)
```
backend/src/
  listing/
    listing.module.ts
    listing.controller.ts   ← REST endpoints
    listing.service.ts      ← business logic
    listing.indexer.ts      ← event listener for ListingCreated etc.
  matching/
    matching.module.ts
    matching.controller.ts
    matching.service.ts
    matching.indexer.ts     ← event listener for MatchExecuted
    urgency-cache.job.ts    ← BullMQ job, runs every 30s
  ipfs/
    ipfs.service.ts         ← Pinata upload helper
```

---

### 2.1 Event Indexer/Listener

**Use `viem`'s `watchContractEvent` to listen for your contract events:**

```typescript
// listing.indexer.ts
publicClient.watchContractEvent({
  address: LISTING_CONTRACT_ADDRESS,
  abi: ListingABI,
  eventName: 'ListingCreated',
  onLogs: async (logs) => {
    for (const log of logs) {
      await prisma.listingsCache.upsert({
        where: { listingId: log.args.listingId.toString() },
        create: { /* map log args to DB row */ },
        update: { /* handle reorgs */ },
      });
    }
  },
});
```

Also listen for: `ListingCancelled`, `ListingExpired`, `ListingStatusUpdated`, `MatchExecuted`

---

### 2.2 REST API Endpoints

Implement and document as OpenAPI spec:

| Method | Path | Your Responsibility |
|---|---|---|
| `POST` | `/listings` | Relay/proxy a new listing tx, or return unsigned tx for wallet signing |
| `GET` | `/listings?region=&status=` | Return from `listings_cache`, fast read |
| `GET` | `/listings/:id` | Single listing with current cached urgency |
| `GET` | `/matches/:id` | Match detail — links to listing + order |

---

### 2.3 Urgency Cache Job (BullMQ)

```typescript
// urgency-cache.job.ts
// Runs every 30 seconds via BullMQ repeatable job
@Process('recompute-urgency')
async handle() {
  const openListings = await prisma.listingsCache.findMany({ where: { chainStatus: 'Open' } });
  for (const listing of openListings) {
    const score = await publicClient.readContract({
      address: MATCHING_ENGINE_ADDRESS,
      abi: MatchingEngineABI,
      functionName: 'computeUrgency',
      args: [BigInt(listing.listingId)],
    });
    await prisma.listingsCache.update({
      where: { listingId: listing.listingId },
      data: { cachedUrgency: score.toString(), updatedAt: new Date() },
    });
  }
}
```

---

### 2.4 IPFS Upload (Pinata)

```typescript
// ipfs.service.ts
async uploadListingPhoto(file: Buffer, filename: string): Promise<string> {
  // POST to Pinata API, return CID
  // CID is stored in listings_cache.image_cid
  // and passed as metadataURI to createListing() on-chain
}
```

---

### 2.5 Database Schema (your tables)

```sql
-- listings_cache (your table — you own migrations for this)
listing_id       TEXT PRIMARY KEY,   -- matches on-chain listingId
chain_status     TEXT,               -- Open | Matched | Settled | Expired | Cancelled
food_type        TEXT,
quantity         NUMERIC,
expiry_ts        TIMESTAMPTZ,
quality_tier     TEXT,
region           TEXT,               -- decoded from locationHash
description      TEXT,               -- off-chain only
image_cid        TEXT,               -- IPFS CID
cached_urgency   NUMERIC,
updated_at       TIMESTAMPTZ

-- matches_cache (also your table — MatchExecuted populates this)
match_id         TEXT PRIMARY KEY,
listing_id       TEXT REFERENCES listings_cache,
order_id         TEXT,               -- B's table reference
urgency_at_match NUMERIC,
tx_hash          TEXT,
matched_at       TIMESTAMPTZ
```

> Note: B's `handoffs` table references `match_id` — your schema is upstream. Coordinate column types.

---

### 📦 Gate 2 Deliverables ✅
- [ ] Indexer running — `listings_cache` and `matches_cache` populated from testnet events
- [ ] `GET /listings` and `GET /matches/:id` returning correct data
- [ ] OpenAPI spec published to `shared/api/listing-openapi.yaml`
- [ ] TypeScript types generated from OpenAPI into `shared/types/`
- [ ] Urgency cache job running (every 30s)
- [ ] IPFS upload working end-to-end (upload a test image → get CID back)
- [ ] Integration tests pass against local Hardhat node + test DB

---

## 🌐 Phase 3 — Frontend / Donor Portal (Weeks 8–9 → Gate 3: Week 10)

**Tech:** Next.js (App Router) + Tailwind CSS + wagmi + RainbowKit + React Query

### Your pages

```
frontend/app/
  donor/
    page.tsx              ← Donor portal home (redirect to connect wallet)
    listings/
      page.tsx            ← "My listings" with live urgency
      new/page.tsx        ← "List surplus" form
      [id]/page.tsx       ← Single listing + match confirmation
```

---

### 3.1 Wallet Connect

```tsx
// Use RainbowKit — standard, evaluators recognize it
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Wrap app in WagmiConfig + RainbowKitProvider (in layout.tsx)
// Configure for Polygon Amoy (chainId: 80002)
```

---

### 3.2 "List Surplus" Form

Fields to collect:
- Food type (dropdown)
- Quantity (number input, kg/meals)
- Expiry date/time (datetime-local)
- Quality tier (radio: High / Medium / Low)
- Pickup location / region (text or pincode)
- Photo (file upload → IPFS via your backend)
- Description (textarea, optional)

On submit:
1. Upload photo to IPFS via `POST /ipfs/upload`
2. Call `POST /listings` (either backend relays tx, or you get unsigned tx and prompt wallet)
3. Show success with on-chain `listingId`

**UX target: donor lists a batch in under 60 seconds** — this is a stated PRD goal. Keep the form minimal.

---

### 3.3 My Listings — Live Urgency Display

```tsx
// Poll urgency every 30s via React Query
const { data: listings } = useQuery({
  queryKey: ['listings', donorAddress],
  queryFn: () => fetch(`/api/listings?donor=${donorAddress}`).then(r => r.json()),
  refetchInterval: 30_000, // poll every 30s
});
```

Display for each listing:
- Food type, quantity, expiry countdown
- **Urgency score** (from `cached_urgency`) — show as a colored bar (green→yellow→red as it rises)
- Status badge: Open / Matched / Settled / Expired / Cancelled

---

### 3.4 Match Confirmation Display

When a listing's status changes to `Matched`:
- Show: matched to which region (NGO anonymized if policy requires)
- Show: urgency score at time of match
- Show: match timestamp
- Link to custody trail (Person B's handoffs view — just link, don't rebuild)

---

### 📦 Gate 3 Deliverables ✅
- [ ] Wallet connect on Polygon Amoy working
- [ ] "List surplus" form submits and creates on-chain listing
- [ ] "My listings" shows live urgency with 30s refresh
- [ ] Match confirmation shown when status changes
- [ ] Responsive layout (Tailwind)
- [ ] End-to-end flow demoable: connect wallet → list → see urgency → see match

---

## 🔗 Phase 4 — Integration & Polish (Weeks 11–12)

### Cross-vertical wiring (with B and C)
- [ ] Verify your `MatchExecuted` event is being picked up by **C's** dashboard aggregator
- [ ] Verify your `matches_cache.match_id` is consistent with what **B's** `Settlement.sol` expects
- [ ] Test full flow end-to-end: list → match → handoff → token mint → dashboard updates

### Bug bash & demo prep
- [ ] Run scripted demo scenario on testnet (list → match → handoff → confirm)
- [ ] Write your section of the technical report:
  - Urgency score design + formula derivation
  - Matching algorithm design + complexity analysis
  - Security decisions (reentrancy, access control, `matchOrders()` permissionlessness)
- [ ] Prepare viva talking points — you'll be asked about:
  - Why the urgency formula is shaped the way it is
  - How the matching is "trustless" (permissionless `matchOrders`)
  - How a party can independently verify a match outcome (`computeUrgency` is public + deterministic)
  - Trade-offs: on-chain urgency vs off-chain cache

---

## 📅 Week-by-Week Checklist

| Week | You do |
|---|---|
| **1** | Gate 0 (joint) — repo scaffold, publish `matchId` format + `MatchExecuted` stub schema |
| **2** | Write `Listing.sol` — functions, events, access control; local unit tests |
| **3** | Write `MatchingEngine.sol` — `computeUrgency()` + `matchOrders()`; unit tests ≥90% |
| **4** | Gate 1 — deploy both to Amoy testnet; export ABIs; freeze event schema for B & C |
| **5** | Build indexer (viem event listener → Postgres); build urgency cache job (BullMQ) |
| **6** | Build REST API (`/listings`, `/matches/:id`); IPFS upload; write integration tests |
| **7** | Gate 2 — API live on testnet; OpenAPI spec frozen; types generated into `shared/` |
| **8** | Build donor portal: wallet connect + "list surplus" form |
| **9** | Build "my listings" view (live urgency) + match confirmation display |
| **10** | Gate 3 — full donor flow demoable end-to-end on testnet |
| **11** | Cross-vertical integration, bug bash, polish |
| **12** | Report writing, viva prep, demo rehearsal, buffer |

---

## 🔄 Interface Contracts (What You Publish for Others)

> These must be agreed and published by **end of Week 1 (Gate 0)**. Do not wait.

### For Person B (Settlement.sol needs `matchId`)
```typescript
// matchId format — agree one of:
// Option A: uint256 auto-increment counter in MatchingEngine
// Option B: bytes32 = keccak256(abi.encodePacked(listingId, orderId, block.timestamp))
// Recommendation: Option A (simpler, easier to reference in Settlement.sol)
```

### For Person C (Dashboard aggregates MatchExecuted)
```solidity
event MatchExecuted(
    uint256 indexed matchId,          // matches Settlement's matchId input
    uint256 indexed listingId,
    uint256 indexed orderId,
    uint256 urgencyScoreAtMatch,      // for "urgency at match" stat on ticker
    uint256 timestamp                 // for time-based aggregation
);
```

---

## 🛠️ Tech Stack Quick Reference

| Layer | Tool |
|---|---|
| Smart contracts | Solidity ^0.8.24 + Hardhat + OpenZeppelin |
| Testnet | Polygon Amoy (chainId 80002) |
| Off-chain media | IPFS via Pinata |
| Backend | NestJS + viem + Prisma + Supabase Postgres |
| Background jobs | BullMQ + Redis |
| Frontend | Next.js App Router + Tailwind + wagmi + RainbowKit + React Query |
| Monorepo | pnpm workspaces + Turborepo |

---

## ⚠️ Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Urgency score is too expensive to recompute on-chain frequently | Compute off-chain for display; only settle final match on-chain — document as explicit trade-off in report |
| `matchOrders()` is permissionless → front-running / gas griefing | Document as known MVP limitation; mention in report. Stretch: use a commit-reveal or keeper whitelist |
| B's Settlement.sol blocked on your `matchId` | Publish format by Week 1 — this is your #1 team dependency |
| Matching logic bugs discovered late | Write tests in Week 2–3, not Week 4. Unit test every edge case in `MatchingEngine` |
| Scope creep (bipartite matching, cross-chain) | Keep on separate branch, only merge after MVP Gate 3 |

---

## 🎤 Viva Prep — Anticipated Questions for Person A

1. **"Why is the urgency score shaped the way it is?"** → Options theta analogy: near-expiry food = near-expiry options, time value accelerates to zero non-linearly.
2. **"How do you guarantee the matching is trustless?"** → `matchOrders()` is permissionless — any party can trigger it, not a central authority. Match outcome is deterministic from public on-chain data.
3. **"How can I verify why Listing X was matched before Listing Y?"** → Call `computeUrgency(X)` and `computeUrgency(Y)` yourself — it's a public view function. Higher score = earlier match. No black box.
4. **"What's the complexity of your matching algorithm?"** → O(n×m) greedy where n=open listings, m=open orders. Discuss extension to bipartite matching.
5. **"Why cache urgency off-chain if the contract can compute it?"** → Avoid paying gas on every dashboard refresh/tick. The authoritative value is still on-chain; the cache is only for display.
