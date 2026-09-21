import {
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import {
  createPublicClient,
  http,
} from "viem";
import { hardhat } from "viem/chains";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Injectable()
export class TokenIndexer implements OnModuleInit {
  private readonly logger = new Logger(TokenIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  async onModuleInit() {
    if (!this.contracts.foodCreditTokenAddress) {
      this.logger.warn(
        "FoodCreditToken contract address not configured — indexer disabled",
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
      `Indexer watching FoodCreditToken events at ${this.contracts.foodCreditTokenAddress}`,
    );

    client.watchContractEvent({
      address: this.contracts.foodCreditTokenAddress,
      abi: this.contracts.foodCreditTokenAbi,
      eventName: "FoodCreditMinted",
      onLogs: (logs) => this.handleFoodCreditMinted(logs),
      onError: (error) => {
        this.logger.error(
          "FoodCreditMinted watcher error",
          error,
        );
      },
    });
  }

  private async handleFoodCreditMinted(logs: any[]) {
    for (const log of logs) {
      const {
        tokenId,
        donor,
        matchId,
        metadataURI,
      } = log.args;

      this.logger.log(
        `FoodCreditMinted: tokenId=${tokenId}, donor=${donor}, matchId=${matchId}`,
      );

      try {
        await this.prisma.foodCreditTokens.upsert({
          where: {
            tokenId: tokenId.toString(),
          },
          create: {
            tokenId: tokenId.toString(),
            donorAddress: donor,
            matchId,
            metadataUri: metadataURI,
            txHash: log.transactionHash ?? "",
            mintedAt: BigInt(
              Math.floor(Date.now() / 1000),
            ),
          },
          update: {
            donorAddress: donor,
            matchId,
            metadataUri: metadataURI,
            txHash: log.transactionHash ?? "",
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to index FoodCreditMinted ${tokenId}`,
          error,
        );
      }
    }
  }
}
