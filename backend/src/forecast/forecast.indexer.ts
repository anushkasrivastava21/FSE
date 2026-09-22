import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { createPublicClient, http } from "viem";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Injectable()
export class ForecastIndexer implements OnModuleInit {
  private readonly logger = new Logger(ForecastIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  async onModuleInit() {
    if (!this.contracts.forecastRegistryAddress) {
      this.logger.warn("ForecastRegistry address not configured — indexer disabled");
      return;
    }
    this.startListening();
  }

  private startListening() {
    const client = createPublicClient({
      chain: this.contracts.getChain(),
      transport: http(this.contracts.getRpcUrl()),
    });

    this.logger.log(`Indexer watching Forecast events at ${this.contracts.forecastRegistryAddress}`);

    client.watchContractEvent({
      address: this.contracts.forecastRegistryAddress,
      abi: this.contracts.forecastRegistryAbi,
      eventName: "ForecastSubmitted",
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            const { ngo, period, expectedQuantity } = (log as any).args;
            await this.prisma.forecastsCache.upsert({
              where: {
                ngoAddress_period: {
                  ngoAddress: ngo.toLowerCase(),
                  period: Number(period),
                }
              },
              create: {
                ngoAddress: ngo.toLowerCase(),
                period: Number(period),
                expectedQuantity: Number(expectedQuantity),
                txHash: log.transactionHash || "",
              },
              update: {
                expectedQuantity: Number(expectedQuantity),
                txHash: log.transactionHash || "",
              }
            });
            this.logger.log(`ForecastSubmitted indexed: NGO ${ngo}, period ${period}, expected ${expectedQuantity}`);
          } catch (error) {
            this.logger.error("Error indexing ForecastSubmitted:", error);
          }
        }
      },
    });

    client.watchContractEvent({
      address: this.contracts.forecastRegistryAddress,
      abi: this.contracts.forecastRegistryAbi,
      eventName: "ForecastScored",
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            const { ngo, period, accuracyScore } = (log as any).args;
            await this.prisma.forecastsCache.update({
              where: {
                ngoAddress_period: {
                  ngoAddress: ngo.toLowerCase(),
                  period: Number(period),
                }
              },
              data: {
                accuracyScore: Number(accuracyScore),
                scored: true,
                txHash: log.transactionHash || "",
              }
            });
            this.logger.log(`ForecastScored indexed: NGO ${ngo}, period ${period}, score ${accuracyScore}`);
          } catch (error) {
            this.logger.error("Error indexing ForecastScored:", error);
          }
        }
      },
    });
  }
}
