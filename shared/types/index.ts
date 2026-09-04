import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// NAMING LOCK (Gate 0 — do not rename these across any layer)
// Entity names must be identical in Solidity structs, DB tables, and TS types.
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export enum ListingStatus {
  Open = "Open",
  Matched = "Matched",
  Settled = "Settled",
  Expired = "Expired",
  Cancelled = "Cancelled",
}

export enum FoodType {
  Cooked = "Cooked",
  Raw = "Raw",
  Packaged = "Packaged",
  Beverage = "Beverage",
  Other = "Other",
}

export enum QualityTier {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

export enum HandoffStage {
  PickedUp = "PickedUp",
  InTransit = "InTransit",
  Delivered = "Delivered",
}

// ── Entity: Listing (Person A) ────────────────────────────────────────────────

export const ListingSchema = z.object({
  listingId: z.string(),          // on-chain uint256 as string (bigint-safe)
  donor: z.string(),              // wallet address
  foodType: z.nativeEnum(FoodType),
  quantity: z.number().positive(),
  expiryTimestamp: z.number(),    // Unix timestamp (seconds)
  qualityTier: z.nativeEnum(QualityTier),
  locationHash: z.string(),       // bytes32 hex string
  metadataURI: z.string(),        // IPFS CID
  status: z.nativeEnum(ListingStatus),
  cachedUrgency: z.number().optional(),  // off-chain display cache, recomputed every 30s
  createdAt: z.number(),          // Unix timestamp
});
export type Listing = z.infer<typeof ListingSchema>;

// ── Entity: Match (Person A produces, Person B and C consume) ─────────────────

export const MatchSchema = z.object({
  matchId: z.string(),            // bytes32 hex string — keccak256(listingId, orderId, ts)
  listingId: z.string(),
  orderId: z.string(),
  urgencyScoreAtMatch: z.number(),
  txHash: z.string(),
  matchedAt: z.number(),          // Unix timestamp
});
export type Match = z.infer<typeof MatchSchema>;

// ── Entity: Order (Person B) ─────────────────────────────────────────────────

export const OrderSchema = z.object({
  orderId: z.string(),
  ngoAddress: z.string(),
  quantity: z.number().positive(),
  urgencyFlag: z.boolean(),
  locationHash: z.string(),
  status: z.enum(["Open", "Matched", "Cancelled"]),
  createdAt: z.number(),
});
export type Order = z.infer<typeof OrderSchema>;

// ── Entity: Handoff (Person B) ───────────────────────────────────────────────

export const HandoffSchema = z.object({
  id: z.string(),
  matchId: z.string(),            // bytes32 — FK to Match
  stage: z.nativeEnum(HandoffStage),
  actorAddress: z.string(),
  txHash: z.string(),
  recordedAt: z.number(),
});
export type Handoff = z.infer<typeof HandoffSchema>;

// ── Entity: ForecastEntry (Person C) ─────────────────────────────────────────

export const ForecastEntrySchema = z.object({
  id: z.string(),
  ngoAddress: z.string(),
  periodStart: z.number(),
  periodEnd: z.number(),
  expectedQuantity: z.number(),
  actualQuantity: z.number().optional(),
  accuracyScore: z.number().min(0).max(100).optional(),
});
export type ForecastEntry = z.infer<typeof ForecastEntrySchema>;

// ── Re-exports ────────────────────────────────────────────────────────────────
// ABI types (TypeChain) will be auto-generated into shared/typechain-types/
// after `pnpm --filter contracts build`. Import from there, not hand-written here.
