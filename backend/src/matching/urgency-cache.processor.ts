import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createPublicClient, http } from "viem";

import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

/**
 * Cron job: recomputes urgency scores for all open listings every 30s.
 * Reads computeUrgency() from the on-chain MatchingEngine contract and
 * caches the result in listings_cache.cached_urgency.
 */
@Injectable()
export class UrgencyCacheProcessor {
  private readonly logger = new Logger(UrgencyCacheProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  @Cron("*/30 * * * * *") // Run every 30 seconds
  async handleCron(): Promise<void> {
    if (!this.contracts.matchingEngineAddress) {
      return;
    }

    const client = createPublicClient({
      chain: this.contracts.getChain(),
      transport: http(this.contracts.getRpcUrl()),
    });

    // Find all open listings
    const openListings = await this.prisma.listingsCache.findMany({
      where: { chainStatus: "Open" },
      select: { listingId: true },
    });

    if (openListings.length === 0) {
      return;
    }

    this.logger.debug(`Recomputing urgency for ${openListings.length} open listings`);

    let updated = 0;
    for (const listing of openListings) {
      try {
        const score = await client.readContract({
          address: this.contracts.matchingEngineAddress,
          abi: this.contracts.matchingEngineAbi,
          functionName: "computeUrgency",
          args: [BigInt(listing.listingId)],
        });

        await this.prisma.listingsCache.update({
          where: { listingId: listing.listingId },
          data: {
            cachedUrgency: BigInt(score as bigint),
          },
        });
        updated++;
      } catch (error) {
        this.logger.warn(
          `Failed to recompute urgency for listing ${listing.listingId}: ${error}`,
        );
      }
    }

    this.logger.debug(`Urgency cache updated: ${updated}/${openListings.length} listings`);
  }
}
