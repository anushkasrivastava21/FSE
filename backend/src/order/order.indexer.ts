import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Injectable()
export class OrderIndexer implements OnModuleInit {
  private readonly logger = new Logger(OrderIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  async onModuleInit() {
    if (!this.contracts.orderAddress) {
      this.logger.warn(
        "Order contract address not configured — indexer disabled",
      );
      return;
    }

    this.startListening();
  }

  private startListening() {
    const client = createPublicClient({
      chain: hardhat,
      transport: http(this.contracts.getRpcUrl()),
    });

    this.logger.log(
      `Indexer watching Order events at ${this.contracts.orderAddress}`,
    );

    client.watchContractEvent({
      address: this.contracts.orderAddress,
      abi: this.contracts.orderAbi,
      eventName: "OrderPlaced",
      onLogs: (logs) => this.handleOrderPlaced(logs),
      onError: (error) => {
        this.logger.error("OrderPlaced watcher error", error);
      },
    });

    client.watchContractEvent({
      address: this.contracts.orderAddress,
      abi: this.contracts.orderAbi,
      eventName: "OrderCancelled",
      onLogs: (logs) => this.handleOrderCancelled(logs),
      onError: (error) => {
        this.logger.error("OrderCancelled watcher error", error);
      },
    });
  }

  private async handleOrderPlaced(logs: any[]) {
    for (const log of logs) {
      const {
        orderId,
        ngo,
        quantity,
        urgencyFlag,
        locationHash,
      } = log.args;

      this.logger.log(
        `OrderPlaced: id=${orderId}, ngo=${ngo}, quantity=${quantity}`,
      );

      try {
        await this.prisma.ordersCache.upsert({
          where: {
            orderId: orderId.toString(),
          },
          create: {
            orderId: orderId.toString(),
            ngoAddress: ngo,
            quantity: Number(quantity),
            urgencyFlag: Boolean(urgencyFlag),
            locationHash,
            chainStatus: "Open",
            txHash: log.transactionHash ?? "",
            createdAt: BigInt(Math.floor(Date.now() / 1000)),
          },
          update: {
            ngoAddress: ngo,
            quantity: Number(quantity),
            urgencyFlag: Boolean(urgencyFlag),
            locationHash,
            chainStatus: "Open",
            txHash: log.transactionHash ?? "",
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to index OrderPlaced ${orderId}`,
          error,
        );
      }
    }
  }

  private async handleOrderCancelled(logs: any[]) {
    for (const log of logs) {
      const { orderId } = log.args;

      this.logger.log(`OrderCancelled: id=${orderId}`);

      try {
        await this.prisma.ordersCache.update({
          where: {
            orderId: orderId.toString(),
          },
          data: {
            chainStatus: "Cancelled",
            txHash: log.transactionHash ?? "",
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to index OrderCancelled ${orderId}`,
          error,
        );
      }
    }
  }
}
