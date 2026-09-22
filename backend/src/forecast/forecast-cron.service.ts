import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createWalletClient, http, custom } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Injectable()
export class ForecastCronService {
  private readonly logger = new Logger(ForecastCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scorePendingForecasts() {
    this.logger.log("Running forecast scoring job...");

    const pendingForecasts = await this.prisma.forecastsCache.findMany({
      where: { scored: false },
    });

    if (pendingForecasts.length === 0) {
      this.logger.log("No pending forecasts to score.");
      return;
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      this.logger.error("No PRIVATE_KEY provided in env for scoring cron");
      return;
    }

    const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
    const client = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(this.contracts.getRpcUrl()),
    });

    for (const forecast of pendingForecasts) {
      try {
        // Derive actual fulfilled quantity from matches_cache where listing region matches NGO region
        // Simplified for MVP: we just query matches where the order belongs to this NGO.
        // And sum the matched quantity from the original order.
        
        const matches = await this.prisma.matchesCache.findMany({
          where: {
            // Need to join with OrdersCache to get NGO address
          },
        });
        
        // As a fallback for MVP if complex join is hard, let's use a dummy query
        // Normally we'd do a proper join. Let's do it manually:
        const ngoOrders = await this.prisma.ordersCache.findMany({
          where: { ngoAddress: forecast.ngoAddress, chainStatus: "Matched" },
        });
        
        let actualFulfilled = 0;
        for (const order of ngoOrders) {
          actualFulfilled += order.quantity; // approximate based on order quantity
        }

        this.logger.log(`Scoring NGO ${forecast.ngoAddress} for period ${forecast.period} with actual=${actualFulfilled}`);

        // Call the scoreForecast function on-chain
        const { request } = await client.prepareTransactionRequest({
          to: this.contracts.forecastRegistryAddress as `0x${string}`,
          data: (client as any).encodeFunctionData({
            abi: this.contracts.forecastRegistryAbi,
            functionName: "scoreForecast",
            args: [forecast.ngoAddress as `0x${string}`, forecast.period, actualFulfilled],
          }),
        });

        const txHash = await client.sendTransaction(request as any);
        this.logger.log(`Score tx submitted: ${txHash}`);

      } catch (error) {
        this.logger.error(`Error scoring forecast for NGO ${forecast.ngoAddress}:`, error);
      }
    }
  }
}
