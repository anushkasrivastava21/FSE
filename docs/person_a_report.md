# Technical Report — Person A (Listing & Matching Engine)

## 1. Urgency Score Design & Formula Derivation

The matching engine serves as the core allocator of the Food Surplus Exchange (FSE). To prioritize food distribution effectively, we implemented an algorithmic urgency score. The urgency score dictates the greed matching priority, ensuring that food nearest to its expiry date and with the highest quality gets matched first.

The formula is based on an options theta analogy: near-expiry food loses its "time value" non-linearly as it approaches expiry.

```
urgency(t) = base_priority(quality, quantity) × decay(expiry - t)
```

**Implementation Details:**
- **Base Priority**: `(qualityTier × 100) + normalized(quantity)`
- **Decay Function**: The decay rises non-linearly as the expiry approaches. If `timeLeft == 0` (expired), it hits a maximum urgency cap (1000). Otherwise, it applies an inverse function `10000 / (timeLeft_in_hours + 1)`.

This design ensures that high-quality, high-quantity food receives a high base score, but the decay function dominates the score as the food reaches its final hours, forcing an immediate match to prevent waste.

## 2. Matching Algorithm Design & Complexity Analysis

For this MVP phase, we implemented a greedy matching algorithm on-chain.

**Algorithm Flow:**
1. Sort all `Open` listings by `computeUrgency()` descending.
2. For the highest urgency listing, iterate through `Open` orders to find the oldest compatible order in the same region.
3. If found, mark both as `Matched` and emit the `MatchExecuted` event.

**Complexity Analysis:**
- The time complexity of the matching algorithm is `O(N × M)`, where `N` is the number of open listings and `M` is the number of open orders.
- While `O(N × M)` is acceptable for an MVP, running this sort-and-match loop strictly on-chain at scale would incur massive gas costs.
- **Future Improvement (Bipartite Matching):** We can move the heavy computation (Hungarian algorithm, `O(N^3)`) off-chain and only submit the verified matches to the chain (e.g., via a ZK-proof or a validator commit-reveal scheme).

## 3. Security Decisions & Trade-offs

### Trustless Matching (`matchOrders` Permissionlessness)
The `matchOrders()` function is intentionally completely permissionless. Any party—a donor, an NGO, or a third-party keeper bot—can call it. This ensures that the matching process is not controlled by a central authority, keeping the platform decentralized.

- **Risk**: A malicious actor could attempt to grief the network by spamming `matchOrders()` or trying to manipulate the order of execution.
- **Mitigation**: The deterministic nature of `computeUrgency()` means that regardless of who calls `matchOrders()`, the matching outcome is mathematically guaranteed to be exactly the same. No one can front-run the matching engine to get a favorable match.

### Cache Trade-offs
To prevent users from having to constantly query the blockchain (which could be slow and rate-limited) just to view live urgency scores on the Donor Portal, we designed an off-chain indexer and caching layer:
- The backend indexer (`viem`) listens to `ListingCreated` events and caches them in Postgres.
- A background BullMQ job re-computes the urgency score every 30 seconds and caches it.
- **Trade-off**: The dashboard's urgency score might be up to 30 seconds stale, but the authoritative score used for the actual execution in `matchOrders()` remains strictly on-chain and perfectly accurate.

## 4. Cross-Vertical Integrations

- **Settlement (Person B)**: We successfully published the `matchId` generation scheme. We elected to use `bytes32 = keccak256(abi.encodePacked(listingId, orderId, block.timestamp))` to ensure global uniqueness, which the `Settlement.sol` contract uses to issue FoodCreditTokens.
- **Dashboard (Person C)**: The `MatchExecuted` event includes `urgencyScoreAtMatch` and `timestamp`, allowing the aggregator dashboard to plot historical matching efficiency without needing to recompute the score retroactively.
