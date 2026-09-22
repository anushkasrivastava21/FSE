-- CreateTable
CREATE TABLE "listings_cache" (
    "listing_id" TEXT NOT NULL PRIMARY KEY,
    "donor" TEXT NOT NULL,
    "food_type" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiry_ts" BIGINT NOT NULL,
    "quality_tier" INTEGER NOT NULL,
    "location_hash" TEXT NOT NULL,
    "metadata_uri" TEXT NOT NULL,
    "chain_status" TEXT NOT NULL DEFAULT 'Open',
    "cached_urgency" BIGINT NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "matches_cache" (
    "match_id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "urgency_at_match" BIGINT NOT NULL,
    "tx_hash" TEXT NOT NULL DEFAULT '',
    "matched_at" BIGINT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "orders_cache" (
    "order_id" TEXT NOT NULL PRIMARY KEY,
    "ngo_address" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "urgency_flag" BOOLEAN NOT NULL,
    "location_hash" TEXT NOT NULL,
    "chain_status" TEXT NOT NULL DEFAULT 'Open',
    "tx_hash" TEXT NOT NULL DEFAULT '',
    "created_at" BIGINT NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "handoffs_cache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "match_id" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "actor" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "tx_hash" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "food_credit_tokens" (
    "token_id" TEXT NOT NULL PRIMARY KEY,
    "donor_address" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "metadata_uri" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL DEFAULT '',
    "minted_at" BIGINT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "listings_cache_chain_status_idx" ON "listings_cache"("chain_status");

-- CreateIndex
CREATE INDEX "listings_cache_donor_idx" ON "listings_cache"("donor");

-- CreateIndex
CREATE INDEX "listings_cache_location_hash_idx" ON "listings_cache"("location_hash");

-- CreateIndex
CREATE INDEX "matches_cache_listing_id_idx" ON "matches_cache"("listing_id");

-- CreateIndex
CREATE INDEX "matches_cache_order_id_idx" ON "matches_cache"("order_id");

-- CreateIndex
CREATE INDEX "orders_cache_ngo_address_idx" ON "orders_cache"("ngo_address");

-- CreateIndex
CREATE INDEX "orders_cache_chain_status_idx" ON "orders_cache"("chain_status");

-- CreateIndex
CREATE INDEX "handoffs_cache_match_id_idx" ON "handoffs_cache"("match_id");

-- CreateIndex
CREATE INDEX "handoffs_cache_stage_idx" ON "handoffs_cache"("stage");

-- CreateIndex
CREATE INDEX "food_credit_tokens_donor_address_idx" ON "food_credit_tokens"("donor_address");

-- CreateIndex
CREATE INDEX "food_credit_tokens_match_id_idx" ON "food_credit_tokens"("match_id");
