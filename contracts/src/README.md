# Urgency Score Formula — `MatchingEngine.sol`

## Overview

The urgency score is the core "price signal" of the FSE exchange. It determines match priority: **higher urgency = matched first**. The score is deterministic and publicly verifiable — any party can call `computeUrgency(listingId)` to independently verify why one listing was matched before another.

## Formula

```
urgency = basePriority × decayMultiplier
```

### Base Priority

```
basePriority = qualityFactor × 100 + quantityFactor
```

| Component | Calculation | Range |
|---|---|---|
| `qualityFactor` | `3 - qualityTier` (High=0→3, Medium=1→2, Low=2→1) | 1–3 |
| `quantityFactor` | `min(quantity, 100)` | 0–100 |
| **basePriority** | | **100–400** |

Higher quality food and larger quantities get higher base priority because they deliver more impact per match.

### Decay Multiplier (Theta Decay Analogy)

```
decayMultiplier = 10000 / (hoursLeft + 1)
```

| Time remaining | `hoursLeft` | `decayMultiplier` |
|---|---|---|
| 24 hours | 24 | 400 |
| 6 hours | 6 | 1,428 |
| 1 hour | 1 | 5,000 |
| < 1 hour | 0 | 10,000 |

This mirrors **options theta decay**: the multiplier rises non-linearly as expiry approaches, creating exponentially increasing urgency for near-expiry listings. Food about to spoil gets matched first.

### Example Calculations

| Listing | Quality | Qty | Expiry | basePriority | decay | **urgency** |
|---|---|---|---|---|---|---|
| A | High (0) | 100kg | 24h left | 400 | 400 | **160,000** |
| B | High (0) | 100kg | 1h left | 400 | 5,000 | **2,000,000** |
| C | Low (2) | 20kg | 24h left | 120 | 400 | **48,000** |
| D | Medium (1) | 50kg | < 1h | 250 | 10,000 | **2,500,000** |

Listing D is matched first despite lower quality, because it's about to expire.

## Design Rationale

1. **Deterministic**: The function uses only on-chain data (`block.timestamp`, listing fields). No external oracles or randomness.
2. **Public view**: Anyone can call `computeUrgency()` — no black box. This is the core "explainable matching" argument.
3. **Non-linear decay**: Linear decay doesn't create enough urgency near expiry. The `1/(t+1)` curve accelerates rapidly in the last hours, which matches real food waste dynamics.
4. **Off-chain caching**: The backend recomputes and caches urgency every 30 seconds for display. The on-chain value remains the source of truth for actual matching.

## LP Duality Verification (Viva Upgrade)

The `matchOrders()` function implements **on-chain verification of bipartite matching optimality** via Linear Programming duality. Off-chain solvers compute the optimal matching using the Hungarian algorithm and submit both the matches and dual potentials `(u[], v[])`. The contract verifies:

1. **Feasibility**: `u[i] + v[j] >= weight(i, j)` for all pairs
2. **Complementary slackness**: `u[i] + v[j] == weight(i, j)` for matched pairs

This mathematically proves the submitted matching is globally optimal — not just a greedy approximation.
