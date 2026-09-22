import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { polygonAmoy, hardhat } from "viem/chains";

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  /**
   * GET /listings — filtered query from cache
   */
  async findAll(filters: {
    status?: string;
    region?: string;
    donor?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.status) {
      where.chainStatus = filters.status;
    }
    if (filters.region) {
      where.locationHash = filters.region;
    }
    if (filters.donor) {
      where.donor = filters.donor;
    }

    const [listings, total] = await Promise.all([
      this.prisma.listingsCache.findMany({
        where,
        orderBy: { cachedUrgency: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.listingsCache.count({ where }),
    ]);

    return {
      data: listings.map(this.serializeListing),
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  /**
   * GET /listings/:id — single listing with cached urgency
   */
  async findOne(listingId: string) {
    const listing = await this.prisma.listingsCache.findUnique({
      where: { listingId },
    });

    if (!listing) {
      return null;
    }

    return this.serializeListing(listing);
  }

  /**
   * POST /listings — prepare an unsigned transaction for the frontend wallet to sign.
   * The backend does NOT hold private keys; it just encodes the calldata.
   */
  prepareCreateListingTx(params: {
    foodType: number;
    quantity: number;
    expiryTimestamp: number;
    qualityTier: number;
    locationHash: string;
    metadataURI: string;
  }) {
    const calldata = encodeFunctionData({
      abi: this.contracts.listingAbi,
      functionName: "createListing",
      args: [
        params.foodType,
        BigInt(params.quantity),
        BigInt(params.expiryTimestamp),
        params.qualityTier,
        params.locationHash as `0x${string}`,
        params.metadataURI,
      ],
    });

    return {
      to: this.contracts.listingAddress,
      data: calldata,
      chainId: parseInt(process.env.CHAIN_ID || "80002", 10),
    };
  }

  /**
   * Convert BigInt fields to strings for JSON serialization
   */
  private serializeListing(listing: any) {
    return {
      ...listing,
      expiryTs: listing.expiryTs.toString(),
      cachedUrgency: listing.cachedUrgency.toString(),
      createdAt: listing.createdAt.toString(),
    };
  }
}
