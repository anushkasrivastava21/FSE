# Contract Events Schema
## FSE Blockchain Food Surplus Exchange
**Gate 0 document — names and signatures frozen after Gate 1. Breaking changes require team notification.**

---

## Events emitted by Person A (MatchingEngine.sol)

### `MatchExecuted`
Emitted by `MatchingEngine.sol` → `matchOrders()` on every successful match.

| Param | Type | Indexed | Description |
|---|---|---|---|
| `matchId` | `bytes32` | ✅ Yes | Unique match ID — `keccak256(abi.encodePacked(listingId, orderId, block.timestamp))` |
| `listingId` | `uint256` | ✅ Yes | The listing that was matched |
| `orderId` | `uint256` | ✅ Yes | The NGO order that was matched |
| `urgencyScoreAtMatch` | `uint256` | ❌ No | Urgency score at time of match |
| `timestamp` | `uint256` | ❌ No | `block.timestamp` of match execution |

**Consumed by:**
- `Settlement.sol` (Person B) — uses `matchId` to validate `recordHandoff()` calls
- Dashboard indexer (Person C) — aggregates all 5 fields for live ticker trade volume

**Solidity signature:**
```solidity
event MatchExecuted(
    bytes32 indexed matchId,
    uint256 indexed listingId,
    uint256 indexed orderId,
    uint256 urgencyScoreAtMatch,
    uint256 timestamp
);
```

---

## Events emitted by Person A (Listing.sol)

### `ListingCreated`
```solidity
event ListingCreated(uint256 indexed listingId, address indexed donor, uint256 expiryTimestamp);
```

### `ListingCancelled`
```solidity
event ListingCancelled(uint256 indexed listingId);
```

### `ListingStatusUpdated`
```solidity
event ListingStatusUpdated(uint256 indexed listingId, uint8 newStatus);
```

---

## Events emitted by Person B (Settlement.sol)

### `HandoffRecorded`
Emitted by `Settlement.sol` → `recordHandoff()` at each custody stage.

| Param | Type | Indexed | Description |
|---|---|---|---|
| `matchId` | `bytes32` | ✅ Yes | Match this handoff belongs to |
| `stage` | `uint8` | ✅ Yes | 0=PickedUp, 1=InTransit, 2=Delivered |
| `actor` | `address` | ✅ Yes | Transporter/NGO who confirmed this stage |
| `timestamp` | `uint256` | ❌ No | `block.timestamp` |

**Consumed by:** Dashboard indexer (Person C) — for chain-of-custody trail display.

```solidity
event HandoffRecorded(
    bytes32 indexed matchId,
    uint8 indexed stage,
    address indexed actor,
    uint256 timestamp
);
```

---

## Events emitted by Person B (Order.sol)

### `OrderCreated`
```solidity
event OrderCreated(uint256 indexed orderId, address indexed ngoAddress, uint256 quantity);
```

### `OrderCancelled`
```solidity
event OrderCancelled(uint256 indexed orderId);
```

---

## Events emitted by Person C (ForecastRegistry.sol)

### `ForecastSubmitted`
```solidity
event ForecastSubmitted(address indexed ngoAddress, uint256 periodStart, uint256 expectedQuantity);
```

### `ForecastScored`
```solidity
event ForecastScored(address indexed ngoAddress, uint256 periodStart, uint256 accuracyScore);
```

---

> **Note:** ABI JSON files will be added to `shared/abi/` by each person after Gate 1 deployment.
> TypeChain-generated TypeScript types will appear in `shared/typechain-types/` after `pnpm --filter contracts build`.
