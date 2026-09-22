import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { createPublicClient, http } from "viem";

import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Injectable()
export class HandoffIndexer implements OnModuleInit {
  private readonly logger = new Logger(HandoffIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  async onModuleInit() {
    if (!this.contracts.settlementAddress) {
      this.logger.warn(
        "Settlement contract address not configured — indexer disabled",
      );
      return;
    }

    this.startListening();
  }

  private startListening() {
    const client = createPublicClient({
      chain: this.contracts.getChain(),
      transport: http(this.contracts.getRpcUrl()),
    });

    this.logger.log(
      `Indexer watching Settlement events at ${this.contracts.settlementAddress}`,
    );

    client.watchContractEvent({
      address: this.contracts.settlementAddress,
      abi: this.contracts.settlementAbi,
      eventName: "HandoffRecorded",
      onLogs: (logs) => this.handleHandoffRecorded(logs),
      onError: (error) => {
        this.logger.error(
          "HandoffRecorded watcher error",
          error,
        );
      },
    });
  }

  private async handleHandoffRecorded(logs: any[]) {
    for (const log of logs) {
      const {
        matchId,
        stage,
        actor,
        timestamp,
      } = log.args;

      this.logger.log(
        `HandoffRecorded: matchId=${matchId}, stage=${stage}, actor=${actor}`,
      );

      try {
        await this.prisma.handoffsCache.create({
          data: {
            matchId,
            stage: Number(stage),
            actor,
            timestamp: BigInt(timestamp),
            txHash: log.transactionHash ?? "",
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to index HandoffRecorded ${matchId}`,
          error,
        );
      }
    }
  }
}
