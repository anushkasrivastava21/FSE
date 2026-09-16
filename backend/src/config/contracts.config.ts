import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

/**
 * Reads contract addresses from deployments/testnet.json and provides
 * them to indexers and services. Also re-exports raw ABI JSON.
 */
@Injectable()
export class ContractsConfigService implements OnModuleInit {
  private readonly logger = new Logger(ContractsConfigService.name);

  public listingAddress!: `0x${string}`;
  public matchingEngineAddress!: `0x${string}`;
  public mockOrderAddress!: `0x${string}`;

  public listingAbi!: readonly any[];
  public matchingEngineAbi!: readonly any[];

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    // Load addresses
    const deploymentsPath =
      this.config.get<string>("CONTRACT_ADDRESSES_PATH") ||
      path.resolve(__dirname, "../../../deployments/testnet.json");

    if (!fs.existsSync(deploymentsPath)) {
      this.logger.warn(`Deployments file not found at ${deploymentsPath}`);
      return;
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

    // Default to localhost; in production use amoy
    const network = this.config.get<string>("CHAIN_NETWORK") || "localhost";
    const addrs = deployments[network];

    if (!addrs) {
      this.logger.warn(`No addresses found for network "${network}"`);
      return;
    }

    this.listingAddress = addrs.Listing as `0x${string}`;
    this.matchingEngineAddress = addrs.MatchingEngine as `0x${string}`;
    this.mockOrderAddress = addrs.MockOrder as `0x${string}`;

    this.logger.log(`Loaded contract addresses for "${network}"`);
    this.logger.log(`  Listing:        ${this.listingAddress}`);
    this.logger.log(`  MatchingEngine: ${this.matchingEngineAddress}`);

    // Load ABIs from shared/abi/
    const abiDir = path.resolve(__dirname, "../../../shared/abi");
    this.listingAbi = JSON.parse(
      fs.readFileSync(path.join(abiDir, "Listing.json"), "utf-8"),
    );
    this.matchingEngineAbi = JSON.parse(
      fs.readFileSync(path.join(abiDir, "MatchingEngine.json"), "utf-8"),
    );
    this.logger.log("Loaded ABIs from shared/abi/");
  }

  /** Returns the RPC URL for the configured chain */
  getRpcUrl(): string {
    return this.config.get<string>("AMOY_RPC_URL") || "http://127.0.0.1:8545";
  }
}
