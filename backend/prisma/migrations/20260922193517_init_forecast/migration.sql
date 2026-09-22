-- CreateTable
CREATE TABLE "forecasts_cache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ngo_address" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "expected_quantity" INTEGER NOT NULL,
    "actual_quantity" INTEGER NOT NULL DEFAULT 0,
    "accuracy_score" INTEGER NOT NULL DEFAULT 0,
    "scored" BOOLEAN NOT NULL DEFAULT false,
    "tx_hash" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "forecasts_cache_ngo_address_idx" ON "forecasts_cache"("ngo_address");

-- CreateIndex
CREATE UNIQUE INDEX "forecasts_cache_ngo_address_period_key" ON "forecasts_cache"("ngo_address", "period");
