# 📋 Person A → Person B: Interface Specification
## FSE Blockchain Food Surplus Exchange
**From:** Person A (Listing & Matching Engine)  
**To:** Person B (Order, Settlement & Token)  
**Purpose:** Everything you need to write `Settlement.sol` — zero open questions, zero optional items.  
**Status:** ✅ Gate 0 FINAL — all decisions locked. Everything below is decided by Person A. Build against it.

---

## Q1 — Exact Solidity type for `matchId`

```solidity
bytes32
```

**Decision:** `bytes32` — `keccak256` hash. Chosen because it is self-describing (encodes its own inputs), blockchain-native, and any party can recompute it without a state lookup.

---

## Q2 — How `matchId` is generated

```solidity
// Inside MatchingEngine.sol → matchOrders(), when a match is confirmed:
bytes32 matchId = keccak256(
    abi.encodePacked(
        listingId,       // uint256 — the matched listing
        orderId,         // uint256 — the matched NGO order
        block.timestamp  // uint256 — time of match execution
    )
);
```

**Decisions:**
- `bytes32(0)` is **never a valid matchId** — use as a zero-sentinel guard in Settlement.
- `matchId` exists on-chain (emitted in `MatchExecuted`) before `recordHandoff()` is ever called.

---

## Q3 — Full `MatchExecuted` event signature

```solidity
event MatchExecuted(
    bytes32 indexed matchId,            // [1] primary key — use in Settlement
    uint256 indexed listingId,          // [2] the listing matched
    uint256 indexed orderId,            // [3] the NGO order matched
    uint256         urgencyScoreAtMatch, // [4] for dashboard ticker (Person C)
    uint256         timestamp           // [5] for dashboard aggregation (Person C)
);
```

**How Settlement uses each param:**

| Param | Type | Indexed | Settlement uses it? |
|---|---|---|---|
| `matchId` | `bytes32` | ✅ Yes | ✅ Directly — passed to `recordHandoff()` |
| `listingId` | `uint256` | ✅ Yes | ✅ Indirectly — retrieved via `IMatchingEngine.matches(matchId).listingId` to get donor address |
| `orderId` | `uint256` | ✅ Yes | ❌ No |
| `urgencyScoreAtMatch` | `uint256` | ❌ No | ❌ No — Person C's dashboard only |
| `timestamp` | `uint256` | ❌ No | ❌ No — Person C's dashboard only |

---

## Q4 — MatchingEngine getters (both decided, both required)

**Both mappings are confirmed. Person B must use both. No optionality.**

```solidity
// In MatchingEngine.sol — both written atomically inside matchOrders():

// Getter 1: boolean guard (cheapest — 1 SLOAD per non-final handoff stage)
mapping(bytes32 => bool) public matchExists;

// Getter 2: full record (used only on Delivered stage for token mint)
struct MatchRecord {
    uint256 listingId;
    uint256 orderId;
    uint256 urgencyScoreAtMatch;
    uint256 timestamp;
}
mapping(bytes32 => MatchRecord) public matches;

// Written together when a match fires:
matchExists[matchId] = true;
matches[matchId] = MatchRecord(listingId, orderId, urgencyScore, block.timestamp);
emit MatchExecuted(matchId, listingId, orderId, urgencyScore, block.timestamp);
```

---

## Q5 — `IListing.sol` interface (published by Person A, used by Settlement)

**Decision: Person A publishes `IListing.sol`. Settlement calls `getListing()` to get the donor address for token minting.**

`IListing.sol` is now committed to the repo at `contracts/src/interfaces/IListing.sol`.

```solidity
interface IListing {

    enum Status { Open, Matched, Settled, Expired, Cancelled }

    struct ListingData {
        address donor;          // ← Settlement reads this for FoodCreditToken.mint()
        uint8   foodType;
        uint256 quantity;
        uint256 expiryTimestamp;
        uint8   qualityTier;
        bytes32 locationHash;
        string  metadataURI;   // ← Settlement reads this as the token's metadataURI
        Status  status;
        uint256 createdAt;
    }

    /// @notice Returns full listing data for a given listingId.
    /// @dev Settlement calls this on final Delivered stage to get donor + metadataURI.
    function getListing(uint256 listingId) external view returns (ListingData memory);
}
```

**Import in `Settlement.sol`:**
```solidity
import "../interfaces/IListing.sol";
```

---

## Q6 — `metadataURI` in `FoodCreditToken.mint()` — decided

**Decision: Settlement passes `listing.metadataURI` directly as the token's `metadataURI`. No new IPFS upload needed.**

Rationale:
- `Listing.metadataURI` is already the IPFS CID for that food batch (photo + description), uploaded by Person A's IPFS service when the listing was created.
- The Food Credit Token for that donation should point to the same metadata — it is proof of *that specific donation*.
- Settlement reads it via `IListing.getListing(listingId).metadataURI` at the `Delivered` stage.

---

## Q7 — Settlement constructor address wiring — decided

**Decision: Settlement receives all three dependency addresses as constructor parameters. No registry, no proxy, no upgradeable pattern at MVP.**

```solidity
contract Settlement {
    IMatchingEngine public immutable matchingEngine;
    IListing        public immutable listing;
    IFoodCreditToken public immutable foodCreditToken;

    constructor(
        address _matchingEngine,   // deployed MatchingEngine address
        address _listing,          // deployed Listing address
        address _foodCreditToken   // deployed FoodCreditToken address
    ) {
        matchingEngine   = IMatchingEngine(_matchingEngine);
        listing          = IListing(_listing);
        foodCreditToken  = IFoodCreditToken(_foodCreditToken);
    }
}
```

**How addresses are passed at deploy time:**
- Deployment script reads from `deployments/testnet.json` (populated after Gate 1).
- **Deploy order is strict:** `Listing` → `MatchingEngine` → `FoodCreditToken` → `Settlement` (Settlement needs all three addresses).
- Person A deploys `Listing` and `MatchingEngine` first and writes their addresses to `deployments/testnet.json`. Person B reads from there.

---

## Q8 — `HandoffStage` enum — decided

**Decision: explicit uint8 enum, Delivered = 2 is the only stage that triggers token mint.**

```solidity
// Shared enum — Person A declares in ISettlement.sol or shared enums file
// Person B implements in Settlement.sol
enum HandoffStage {
    PickedUp,   // 0 — transporter confirms pickup from donor
    InTransit,  // 1 — transporter confirms in transit
    Delivered   // 2 — NGO confirms receipt → triggers FoodCreditToken.mint()
}
```

**`HandoffRecorded` event (Person B emits this):**
```solidity
event HandoffRecorded(
    bytes32 indexed matchId,
    HandoffStage indexed stage,
    address indexed actor,
    uint256 timestamp
);
```

---

## Q9 — Full `recordHandoff()` flow — decided end-to-end

**The complete implementation logic for Settlement, decided by Person A:**

```solidity
function recordHandoff(
    bytes32      matchId,
    HandoffStage stage,
    address      actor
) external nonReentrant {

    // 1. Validate matchId exists (guard against forged IDs)
    require(matchingEngine.matchExists(matchId), "Settlement: invalid matchId");

    // 2. Validate stage progression (no skipping, no replaying)
    require(
        uint8(stage) == uint8(lastStage[matchId]) + 1,
        "Settlement: invalid stage order"
    );
    lastStage[matchId] = stage;

    // 3. Emit immutable custody event
    emit HandoffRecorded(matchId, stage, actor, block.timestamp);

    // 4. On Delivered: mint soulbound Food Credit Token to donor
    if (stage == HandoffStage.Delivered) {
        IMatchingEngine.MatchRecord memory matchRecord = matchingEngine.matches(matchId);
        IListing.ListingData memory listingData = listing.getListing(matchRecord.listingId);

        foodCreditToken.mint(
            listingData.donor,      // recipient = donor who listed the food
            matchId,                // ties token to this specific match
            listingData.metadataURI // IPFS CID from the original listing
        );
    }
}

// State needed in Settlement:
mapping(bytes32 => HandoffStage) public lastStage; // tracks last recorded stage per match
```

---

## Q10 — Interface Files Inventory (what is live in repo right now)

| File | Status | Published by |
|---|---|---|
| `contracts/src/interfaces/IMatchingEngine.sol` | ✅ Live in repo | Person A |
| `contracts/src/interfaces/IListing.sol` | ✅ Live in repo | Person A |
| `contracts/src/interfaces/IFoodCreditToken.sol` | ✅ Live in repo | Person B owns — stub published by Person A to unblock Settlement |

---

## Summary — TL;DR for Person B

| Decision | Answer |
|---|---|
| `matchId` type | `bytes32` |
| `matchId` generation | `keccak256(abi.encodePacked(listingId, orderId, block.timestamp))` |
| `bytes32(0)` | Always invalid — zero sentinel |
| `MatchExecuted` event | `(bytes32 indexed matchId, uint256 indexed listingId, uint256 indexed orderId, uint256 urgencyScoreAtMatch, uint256 timestamp)` |
| Getter 1 | `matchExists(bytes32) → bool` — guard at top of `recordHandoff()` |
| Getter 2 | `matches(bytes32) → MatchRecord` — read on `Delivered` stage only |
| Donor address | `IListing.getListing(matchRecord.listingId).donor` |
| Token `metadataURI` | `IListing.getListing(matchRecord.listingId).metadataURI` |
| Settlement constructor | Takes `(address matchingEngine, address listing, address foodCreditToken)` |
| Deploy order | `Listing` → `MatchingEngine` → `FoodCreditToken` → `Settlement` |
| HandoffStage enum | `PickedUp=0`, `InTransit=1`, `Delivered=2` — Delivered triggers mint |
| Stage validation | Sequential — no skipping, no replaying — `lastStage` mapping |
| Interface files | All live in `contracts/src/interfaces/` — import and build |

---

## Action Items

| Who | Action | By when | Status |
|---|---|---|---|
| **Person A** | `bytes32` matchId confirmed | Week 1 | ✅ Done |
| **Person A** | `IMatchingEngine.sol` published | Week 1 | ✅ Done |
| **Person A** | `IListing.sol` published | Week 1 | ✅ Done |
| **Person A** | `IFoodCreditToken.sol` stub published | Week 1 | ✅ Done |
| **Person A** | All Gate 0 decisions locked (Q1–Q9) | Week 1 | ✅ Done |
| **Person B** | Clone repo, import interfaces, begin `Settlement.sol` | Week 2 | ⏳ Pending |
| **Person A** | Implement full `Listing.sol` + `MatchingEngine.sol` with mappings | Weeks 2–3 | ⏳ In progress |
| **Person A** | Deploy + write addresses to `deployments/testnet.json` | Gate 1 (Week 4) | ⏳ Pending |
| **Both** | Integration test — verify `bytes32 matchId` flows end-to-end | Gate 2 (Week 7) | ⏳ Pending |
