import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /matches/:id — single match record
   */
  async findOne(matchId: string) {
    const match = await this.prisma.matchesCache.findUnique({
      where: { matchId },
    });

    if (!match) {
      return null;
    }

    return this.serializeMatch(match);
  }

  /**
   * GET /matches — list recent matches
   */
  async findAll(filters: { listingId?: string; limit?: number; offset?: number }) {
    const where: any = {};

    if (filters.listingId) {
      where.listingId = filters.listingId;
    }

    const [matches, total] = await Promise.all([
      this.prisma.matchesCache.findMany({
        where,
        orderBy: { matchedAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.matchesCache.count({ where }),
    ]);

    return {
      data: matches.map(this.serializeMatch),
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  /**
   * POST /matches/execute — execute matching engine on-chain
   */
  async executeMatch() {
    if (!this.contracts.matchingEngineAddress) {
      throw new BadRequestException("MatchingEngine contract address not configured");
    }

    const rpcUrl = this.contracts.getRpcUrl();
    const chain = this.contracts.getChain();

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    let rawKey =
      this.config.get<string>("PRIVATE_KEY") ||
      "562f8e93b85f40184907d14d561d6dc6710d2f032bd0f045a8aa98da296f621f";
    if (!rawKey.startsWith("0x")) {
      rawKey = `0x${rawKey}`;
    }

    const account = privateKeyToAccount(rawKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    // 1. Read on-chain counters
    const nextListingId = (await publicClient.readContract({
      address: this.contracts.listingAddress,
      abi: this.contracts.listingAbi,
      functionName: "nextListingId",
    })) as bigint;

    const nextOrderId = (await publicClient.readContract({
      address: this.contracts.orderAddress,
      abi: this.contracts.orderAbi,
      functionName: "nextOrderId",
    })) as bigint;

    if (nextListingId <= 1n || nextOrderId <= 1n) {
      return {
        success: false,
        message: "No listings or orders recorded on-chain yet.",
      };
    }

    // 2. Collect Open listings
    const openListings: { id: bigint; locationHash: string }[] = [];
    for (let i = 1n; i < nextListingId; i++) {
      try {
        const l = (await publicClient.readContract({
          address: this.contracts.listingAddress,
          abi: this.contracts.listingAbi,
          functionName: "getListing",
          args: [i],
        })) as any;
        if (Number(l.status) === 0) {
          openListings.push({ id: i, locationHash: l.locationHash });
        }
      } catch (err) {
        // continue
      }
    }

    // 3. Collect Open orders
    const openOrders: { id: bigint; locationHash: string }[] = [];
    for (let j = 1n; j < nextOrderId; j++) {
      try {
        const o = (await publicClient.readContract({
          address: this.contracts.orderAddress,
          abi: this.contracts.orderAbi,
          functionName: "getOrder",
          args: [j],
        })) as any;
        if (Number(o.status) === 0) {
          openOrders.push({ id: j, locationHash: o.locationHash });
        }
      } catch (err) {
        // continue
      }
    }

    if (openListings.length === 0) {
      return {
        success: false,
        message: "No Open surplus listings available to match.",
      };
    }

    if (openOrders.length === 0) {
      return {
        success: false,
        message: "No Open NGO demand orders available to match.",
      };
    }

    // 4. Match compatible pairs (matching locationHash)
    const matchedListings: bigint[] = [];
    const matchedOrders: bigint[] = [];
    const weights: bigint[] = [];
    const dualV: bigint[] = [];
    const usedOrders = new Set<string>();

    for (const listing of openListings) {
      const order = openOrders.find(
        (o) =>
          !usedOrders.has(o.id.toString()) &&
          o.locationHash === listing.locationHash,
      );

      if (order) {
        usedOrders.add(order.id.toString());
        matchedListings.push(listing.id);
        matchedOrders.push(order.id);

        const weight = (await publicClient.readContract({
          address: this.contracts.matchingEngineAddress,
          abi: this.contracts.matchingEngineAbi,
          functionName: "computeUrgency",
          args: [listing.id],
        })) as bigint;

        weights.push(weight);
        dualV.push(0n);
      }
    }

    if (matchedListings.length === 0) {
      return {
        success: false,
        message:
          "Open listings and orders exist, but their location pincodes do not match. Ensure donor and NGO use the same pincode/region.",
      };
    }

    // 5. Submit transaction to MatchingEngine.matchOrders
    this.logger.log(
      `Executing match for ${matchedListings.length} pair(s) on-chain...`,
    );

    try {
      const txHash = await (walletClient as any).writeContract({
        address: this.contracts.matchingEngineAddress,
        abi: this.contracts.matchingEngineAbi,
        functionName: "matchOrders",
        args: [matchedListings, matchedOrders, weights, dualV],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      this.logger.log(`Match transaction confirmed: ${txHash}`);

      return {
        success: true,
        message: `Executed match for ${matchedListings.length} pair(s) successfully!`,
        txHash,
        matchedCount: matchedListings.length,
        pairs: matchedListings.map((lId, idx) => ({
          listingId: lId.toString(),
          orderId: matchedOrders[idx].toString(),
          weight: weights[idx].toString(),
        })),
      };
    } catch (err: any) {
      this.logger.error(`Match execution failed: ${err.message}`);
      return {
        success: false,
        message: `Match execution failed: ${err.shortMessage || err.message}`,
      };
    }
  }

  private serializeMatch(match: any) {
    return {
      ...match,
      urgencyAtMatch: match.urgencyAtMatch.toString(),
      matchedAt: match.matchedAt.toString(),
    };
  }
}
