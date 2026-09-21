import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const networkName = network.name;
  const [deployer] = await ethers.getSigners();

  console.log(`Starting deployment to ${networkName}...`);
  console.log("Deploying contracts with:", deployer.address);

  // ------------------------------------------------------------
  // 1. Deploy Listing
  // ------------------------------------------------------------
  console.log("\n1. Deploying Listing...");

  const Listing = await ethers.getContractFactory("Listing");
  const listing = await Listing.deploy();
  await listing.waitForDeployment();

  const listingAddress = await listing.getAddress();

  console.log("Listing:", listingAddress);

  // ------------------------------------------------------------
  // 2. Deploy Order
  // ------------------------------------------------------------
  console.log("\n2. Deploying Order...");

  const Order = await ethers.getContractFactory("Order");
  const order = await Order.deploy();
  await order.waitForDeployment();

  const orderAddress = await order.getAddress();

  console.log("Order:", orderAddress);

  // ------------------------------------------------------------
  // 3. Deploy MatchingEngine
  //    Depends on Listing + Order
  // ------------------------------------------------------------
  console.log("\n3. Deploying MatchingEngine...");

  const MatchingEngine =
    await ethers.getContractFactory("MatchingEngine");

  const matchingEngine = await MatchingEngine.deploy(
    listingAddress,
    orderAddress
  );

  await matchingEngine.waitForDeployment();

  const matchingEngineAddress =
    await matchingEngine.getAddress();

  console.log("MatchingEngine:", matchingEngineAddress);

  // ------------------------------------------------------------
  // 4. Deploy FoodCreditToken
  // ------------------------------------------------------------
  console.log("\n4. Deploying FoodCreditToken...");

  const FoodCreditToken =
    await ethers.getContractFactory("FoodCreditToken");

  const foodCreditToken = await FoodCreditToken.deploy();

  await foodCreditToken.waitForDeployment();

  const foodCreditTokenAddress =
    await foodCreditToken.getAddress();

  console.log("FoodCreditToken:", foodCreditTokenAddress);

  // ------------------------------------------------------------
  // 5. Deploy Settlement
  //
  // Current Settlement constructor:
  // (initialOwner, matchingEngine, listing, foodCreditToken)
  // ------------------------------------------------------------
  console.log("\n5. Deploying Settlement...");

  const Settlement =
    await ethers.getContractFactory("Settlement");

  const settlement = await Settlement.deploy(
    deployer.address,
    matchingEngineAddress,
    listingAddress,
    foodCreditTokenAddress
  );

  await settlement.waitForDeployment();

  const settlementAddress =
    await settlement.getAddress();

  console.log("Settlement:", settlementAddress);

  // ------------------------------------------------------------
  // 6. Wire Listing
  //    MatchingEngine + Settlement may update listing status
  // ------------------------------------------------------------
  console.log("\n6. Authorizing MatchingEngine + Settlement in Listing...");

  const listingTx = await listing.setAuthorizedContracts(
    matchingEngineAddress,
    settlementAddress
  );

  await listingTx.wait();

  console.log("Listing authorization configured.");

  // ------------------------------------------------------------
  // 7. Wire Order
  //    MatchingEngine may update order status
  // ------------------------------------------------------------
  console.log("\n7. Authorizing MatchingEngine in Order...");

  const orderTx = await order.setMatchingEngine(
    matchingEngineAddress
  );

  await orderTx.wait();

  console.log("Order authorization configured.");

  // ------------------------------------------------------------
  // 8. Wire FoodCreditToken
  //    Settlement may mint Food Credit NFTs
  // ------------------------------------------------------------
  console.log("\n8. Authorizing Settlement in FoodCreditToken...");

  const tokenTx = await foodCreditToken.setSettlement(
    settlementAddress
  );

  await tokenTx.wait();

  console.log("FoodCreditToken authorization configured.");

  // ------------------------------------------------------------
  // 9. Save deployment addresses
  // ------------------------------------------------------------
  const deploymentsPath = path.resolve(
    __dirname,
    "../../deployments/testnet.json"
  );

  let deployments: Record<
    string,
    Record<string, string>
  > = {};

  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(
      fs.readFileSync(deploymentsPath, "utf-8")
    );
  }

  const key =
    networkName === "hardhat"
      ? "localhost"
      : networkName;

  deployments[key] = {
    ...deployments[key],

    Listing: listingAddress,
    Order: orderAddress,
    MatchingEngine: matchingEngineAddress,
    FoodCreditToken: foodCreditTokenAddress,
    Settlement: settlementAddress,

    // Keep existing entries if present.
    MockOrder: deployments[key]?.MockOrder || "",
    ForecastRegistry:
      deployments[key]?.ForecastRegistry || "",
  };

  fs.writeFileSync(
    deploymentsPath,
    JSON.stringify(deployments, null, 2) + "\n"
  );

  // ------------------------------------------------------------
  // 10. Final output
  // ------------------------------------------------------------
  console.log("\n========================================");
  console.log("Deployment Successful!");
  console.log("========================================");
  console.log("Network:        ", networkName);
  console.log("Deployer:       ", deployer.address);
  console.log("----------------------------------------");
  console.log("Listing:        ", listingAddress);
  console.log("Order:          ", orderAddress);
  console.log("MatchingEngine: ", matchingEngineAddress);
  console.log("FoodCreditToken: ", foodCreditTokenAddress);
  console.log("Settlement:     ", settlementAddress);
  console.log("----------------------------------------");
  console.log("Addresses saved to:");
  console.log(deploymentsPath);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
