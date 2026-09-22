import { Injectable } from "@nestjs/common";
import { encodeFunctionData } from "viem";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Injectable()
export class HandoffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  /**
   * GET /handoffs
   *
   * Returns cached custody records.
   */
  async findAll(filters: {
    matchId?: string;
    stage?: number;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.matchId) {
      where.matchId = filters.matchId;
    }

    if (filters.stage !== undefined) {
      where.stage = filters.stage;
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const [handoffs, total] = await Promise.all([
      this.prisma.handoffsCache.findMany({
        where,
        orderBy: {
          timestamp: "asc",
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.handoffsCache.count({ where }),
    ]);

    return {
      data: handoffs.map(this.serializeHandoff),
      total,
      limit,
      offset,
    };
  }

  /**
   * GET /handoffs/:matchId
   *
   * Returns the complete custody trail for a match.
   */
  async findByMatchId(matchId: string) {
    const handoffs = await this.prisma.handoffsCache.findMany({
      where: {
        matchId,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    return {
      matchId,
      data: handoffs.map(this.serializeHandoff),
      total: handoffs.length,
    };
  }

  /**
   * POST /handoffs
   *
   * Prepares an unsigned Settlement.recordHandoff transaction.
   */
  prepareRecordHandoffTx(params: {
    matchId: string;
    stage: number;
    actor: string;
  }) {
    if (!params.matchId || params.matchId === "0x" + "0".repeat(64)) {
      throw new Error("Invalid matchId");
    }

    if (params.stage < 0 || params.stage > 2) {
      throw new Error(
        "Invalid stage. Use 0 for PickedUp, 1 for InTransit, 2 for Delivered.",
      );
    }

    const calldata = encodeFunctionData({
      abi: this.contracts.settlementAbi,
      functionName: "recordHandoff",
      args: [
        params.matchId as `0x${string}`,
        params.stage,
        params.actor as `0x${string}`,
      ],
    });

    return {
      to: this.contracts.settlementAddress,
      data: calldata,
      chainId: parseInt(
        process.env.CHAIN_ID || "80002",
        10,
      ),
    };
  }

  private serializeHandoff(handoff: any) {
    return {
      ...handoff,
      timestamp: handoff.timestamp.toString(),
    };
  }
}
