import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

/**
 * Event indexer for MatchingEngine.sol.
 * Listens for MatchExecuted events and writes to matches_cache.
 */
@Injectable()
export class MatchingIndexer implements OnModuleInit {
  private readonly logger = new Logger(MatchingIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  async onModuleInit() {
    if (!this.contracts.matchingEngineAddress) {
      this.logger.warn("MatchingEngine address not configured — indexer disabled");
      return;
    }

    this.startListening();
  }

  private startListening() {
    const rpcUrl = this.contracts.getRpcUrl();
    const client = createPublicClient({
      chain: hardhat,
      transport: http(rpcUrl),
    });

    this.logger.log(
      `Indexer watching MatchExecuted events at ${this.contracts.matchingEngineAddress}`,
    );

    client.watchContractEvent({
      address: this.contracts.matchingEngineAddress,
      abi: this.contracts.matchingEngineAbi,
      eventName: "MatchExecuted",
      onLogs: (logs) => this.handleMatchExecuted(logs),
      onError: (error) => this.logger.error("MatchExecuted watcher error", error),
    });
  }

  private async handleMatchExecuted(logs: any[]) {
    for (const log of logs) {
      const { matchId, listingId, orderId, urgencyScoreAtMatch, timestamp } =
        log.args;
      this.logger.log(
        `MatchExecuted: matchId=${matchId}, listing=${listingId}, order=${orderId}`,
      );

      try {
        await this.prisma.matchesCache.upsert({
          where: { matchId: matchId.toString() },
          create: {
            matchId: matchId.toString(),
            listingId: listingId.toString(),
            orderId: orderId.toString(),
            urgencyAtMatch: BigInt(urgencyScoreAtMatch),
            txHash: log.transactionHash || "",
            matchedAt: BigInt(timestamp),
          },
          update: {
            listingId: listingId.toString(),
            orderId: orderId.toString(),
            urgencyAtMatch: BigInt(urgencyScoreAtMatch),
            txHash: log.transactionHash || "",
          },
        });

        // Also update the listing status in listings_cache
        await this.prisma.listingsCache
          .update({
            where: { listingId: listingId.toString() },
            data: { chainStatus: "Matched" },
          })
          .catch(() => {
            // Listing may not be indexed yet; the ListingStatusUpdated event will handle it
            this.logger.warn(
              `Could not update listing ${listingId} status — may not be indexed yet`,
            );
          });
      } catch (error) {
        this.logger.error(`Failed to index MatchExecuted ${matchId}`, error);
      }
    }
  }
}
