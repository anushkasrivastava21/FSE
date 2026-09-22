import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { createPublicClient, http, parseAbiItem, type Log } from "viem";

import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

/**
 * Event indexer for Listing.sol.
 * Uses viem's watchContractEvent to listen for on-chain events
 * and upsert into listings_cache.
 */
@Injectable()
export class ListingIndexer implements OnModuleInit {
  private readonly logger = new Logger(ListingIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  async onModuleInit() {
    if (!this.contracts.listingAddress) {
      this.logger.warn("Listing contract address not configured — indexer disabled");
      return;
    }

    this.startListening();
  }

  private startListening() {
    const rpcUrl = this.contracts.getRpcUrl();
    const client = createPublicClient({
      chain: this.contracts.getChain(),
      transport: http(rpcUrl),
    });

    this.logger.log(`Indexer watching Listing events at ${this.contracts.listingAddress}`);

    // Watch ListingCreated
    client.watchContractEvent({
      address: this.contracts.listingAddress,
      abi: this.contracts.listingAbi,
      eventName: "ListingCreated",
      onLogs: (logs) => this.handleListingCreated(logs),
      onError: (error) => this.logger.error("ListingCreated watcher error", error),
    });

    // Watch ListingCancelled
    client.watchContractEvent({
      address: this.contracts.listingAddress,
      abi: this.contracts.listingAbi,
      eventName: "ListingCancelled",
      onLogs: (logs) => this.handleListingCancelled(logs),
      onError: (error) => this.logger.error("ListingCancelled watcher error", error),
    });

    // Watch ListingStatusUpdated
    client.watchContractEvent({
      address: this.contracts.listingAddress,
      abi: this.contracts.listingAbi,
      eventName: "ListingStatusUpdated",
      onLogs: (logs) => this.handleListingStatusUpdated(logs),
      onError: (error) => this.logger.error("ListingStatusUpdated watcher error", error),
    });
  }

  private async handleListingCreated(logs: any[]) {
    for (const log of logs) {
      const { listingId, donor, expiryTimestamp } = log.args;
      this.logger.log(`ListingCreated: id=${listingId}, donor=${donor}`);

      try {
        // Read full listing data from chain
        const client = createPublicClient({
          chain: this.contracts.getChain(),
          transport: http(this.contracts.getRpcUrl()),
        });

        const listingData = await client.readContract({
          address: this.contracts.listingAddress,
          abi: this.contracts.listingAbi,
          functionName: "getListing",
          args: [listingId],
        }) as any;

        await this.prisma.listingsCache.upsert({
          where: { listingId: listingId.toString() },
          create: {
            listingId: listingId.toString(),
            donor: listingData.donor,
            foodType: Number(listingData.foodType),
            quantity: Number(listingData.quantity),
            expiryTs: BigInt(listingData.expiryTimestamp),
            qualityTier: Number(listingData.qualityTier),
            locationHash: listingData.locationHash,
            metadataUri: listingData.metadataURI,
            chainStatus: "Open",
            cachedUrgency: BigInt(0),
            createdAt: BigInt(listingData.createdAt),
          },
          update: {
            donor: listingData.donor,
            foodType: Number(listingData.foodType),
            quantity: Number(listingData.quantity),
            chainStatus: "Open",
          },
        });
      } catch (error) {
        this.logger.error(`Failed to index ListingCreated ${listingId}`, error);
      }
    }
  }

  private async handleListingCancelled(logs: any[]) {
    for (const log of logs) {
      const { listingId } = log.args;
      this.logger.log(`ListingCancelled: id=${listingId}`);

      try {
        await this.prisma.listingsCache.update({
          where: { listingId: listingId.toString() },
          data: { chainStatus: "Cancelled" },
        });
      } catch (error) {
        this.logger.error(`Failed to index ListingCancelled ${listingId}`, error);
      }
    }
  }

  private async handleListingStatusUpdated(logs: any[]) {
    for (const log of logs) {
      const { listingId, newStatus } = log.args;

      const statusMap: Record<number, string> = {
        0: "Open",
        1: "Matched",
        2: "Settled",
        3: "Expired",
        4: "Cancelled",
      };

      const statusStr = statusMap[Number(newStatus)] || "Open";
      this.logger.log(`ListingStatusUpdated: id=${listingId}, status=${statusStr}`);

      try {
        await this.prisma.listingsCache.update({
          where: { listingId: listingId.toString() },
          data: { chainStatus: statusStr },
        });
      } catch (error) {
        this.logger.error(`Failed to index ListingStatusUpdated ${listingId}`, error);
      }
    }
  }
}
