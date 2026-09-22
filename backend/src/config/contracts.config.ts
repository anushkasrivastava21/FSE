import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class ContractsConfigService implements OnModuleInit {
  private readonly logger = new Logger(ContractsConfigService.name);

  public listingAddress!: `0x${string}`;
  public matchingEngineAddress!: `0x${string}`;
  public mockOrderAddress!: `0x${string}`;
  public orderAddress!: `0x${string}`;
  public settlementAddress!: `0x${string}`;
  public foodCreditTokenAddress!: `0x${string}`;

  public listingAbi!: readonly any[];
  public matchingEngineAbi!: readonly any[];
  public orderAbi!: readonly any[];
  public settlementAbi!: readonly any[];
  public foodCreditTokenAbi!: readonly any[];

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const deploymentsPath =
      this.config.get<string>("CONTRACT_ADDRESSES_PATH") ||
      path.resolve(__dirname, "../../../deployments/testnet.json");

    if (!fs.existsSync(deploymentsPath)) {
      this.logger.warn(`Deployments file not found at ${deploymentsPath}`);
      return;
    }

    const deployments = JSON.parse(
      fs.readFileSync(deploymentsPath, "utf-8"),
    );

    const network =
      this.config.get<string>("CHAIN_NETWORK") || "localhost";

    const addrs = deployments[network];

    if (!addrs) {
      this.logger.warn(`No addresses found for network "${network}"`);
      return;
    }

    this.listingAddress = addrs.Listing as `0x${string}`;
    this.matchingEngineAddress =
      addrs.MatchingEngine as `0x${string}`;
    this.mockOrderAddress = addrs.MockOrder as `0x${string}`;
    this.orderAddress = addrs.Order as `0x${string}`;
    this.settlementAddress = addrs.Settlement as `0x${string}`;
    this.foodCreditTokenAddress =
      addrs.FoodCreditToken as `0x${string}`;

    this.logger.log(`Loaded contract addresses for "${network}"`);
    this.logger.log(`  Listing:          ${this.listingAddress}`);
    this.logger.log(`  MatchingEngine:   ${this.matchingEngineAddress}`);
    this.logger.log(`  Order:            ${this.orderAddress}`);
    this.logger.log(`  Settlement:       ${this.settlementAddress}`);
    this.logger.log(
      `  FoodCreditToken:  ${this.foodCreditTokenAddress}`,
    );

    const abiDir = path.resolve(__dirname, "../../../shared/abi");

    this.listingAbi = JSON.parse(
      fs.readFileSync(
        path.join(abiDir, "Listing.json"),
        "utf-8",
      ),
    );

    this.matchingEngineAbi = JSON.parse(
      fs.readFileSync(
        path.join(abiDir, "MatchingEngine.json"),
        "utf-8",
      ),
    );

    this.orderAbi = JSON.parse(
      fs.readFileSync(
        path.join(abiDir, "Order.json"),
        "utf-8",
      ),
    );

    this.settlementAbi = JSON.parse(
      fs.readFileSync(
        path.join(abiDir, "Settlement.json"),
        "utf-8",
      ),
    );

    this.foodCreditTokenAbi = JSON.parse(
      fs.readFileSync(
        path.join(abiDir, "FoodCreditToken.json"),
        "utf-8",
      ),
    );

    this.logger.log("Loaded ABIs from shared/abi/");
  }

  getRpcUrl(): string {
    return (
      this.config.get<string>("AMOY_RPC_URL") ||
      "http://127.0.0.1:8545"
    );
  }
}
