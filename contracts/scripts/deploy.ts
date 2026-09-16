import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const networkName = network.name; // "localhost" or "amoy"
  console.log(`Starting deployment to ${networkName}...`);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Listing
  console.log("Deploying Listing...");
  const Listing = await ethers.getContractFactory("Listing");
  const listing = await Listing.deploy();
  await listing.waitForDeployment();
  const listingAddress = await listing.getAddress();
  console.log(`Listing deployed to: ${listingAddress}`);

  // 2. Deploy MockOrder (stand-in until Person B deploys Order.sol)
  console.log("Deploying MockOrder...");
  const MockOrder = await ethers.getContractFactory("MockOrder");
  const mockOrder = await MockOrder.deploy();
  await mockOrder.waitForDeployment();
  const mockOrderAddress = await mockOrder.getAddress();
  console.log(`MockOrder deployed to: ${mockOrderAddress}`);

  // 3. Deploy MatchingEngine
  console.log("Deploying MatchingEngine...");
  const MatchingEngine = await ethers.getContractFactory("MatchingEngine");
  const matchingEngine = await MatchingEngine.deploy(listingAddress, mockOrderAddress);
  await matchingEngine.waitForDeployment();
  const matchingEngineAddress = await matchingEngine.getAddress();
  console.log(`MatchingEngine deployed to: ${matchingEngineAddress}`);

  // 4. Authorize MatchingEngine in Listing (settlement = ZeroAddress for now until Person B deploys)
  console.log("Authorizing MatchingEngine to update Listing status...");
  const tx = await listing.setAuthorizedContracts(matchingEngineAddress, ethers.ZeroAddress);
  await tx.wait();
  console.log("MatchingEngine authorized.");

  // 5. Write deployed addresses to deployments/testnet.json
  const deploymentsPath = path.resolve(__dirname, "../../deployments/testnet.json");
  let deployments: Record<string, Record<string, string>> = {};
  
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  }

  // Use network name as key — "localhost" or "amoy"
  const key = networkName === "hardhat" ? "localhost" : networkName;
  deployments[key] = {
    ...deployments[key],
    Listing: listingAddress,
    MockOrder: mockOrderAddress,
    MatchingEngine: matchingEngineAddress,
    // Preserve Person B/C addresses if they exist
    Order: deployments[key]?.Order || "",
    Settlement: deployments[key]?.Settlement || "",
    FoodCreditToken: deployments[key]?.FoodCreditToken || "",
    ForecastRegistry: deployments[key]?.ForecastRegistry || "",
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + "\n");
  console.log(`\nAddresses written to ${deploymentsPath}`);

  console.log("\nDeployment Successful!");
  console.log("----------------------");
  console.log("Listing:        ", listingAddress);
  console.log("MockOrder:      ", mockOrderAddress);
  console.log("MatchingEngine: ", matchingEngineAddress);
  console.log("----------------------");
  console.log("Next step: Person B will deploy Order.sol and we will update MatchingEngine later if needed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
