import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy ForecastRegistry
  const ForecastRegistry = await ethers.getContractFactory("ForecastRegistry");
  const forecastRegistry = await ForecastRegistry.deploy();
  await forecastRegistry.waitForDeployment();
  const forecastRegistryAddress = await forecastRegistry.getAddress();

  console.log("ForecastRegistry deployed to:", forecastRegistryAddress);

  // Update deployments JSON
  const deploymentPath = path.join(__dirname, "../../deployments/testnet.json");
  let deployments: Record<string, string> = {};

  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  deployments.ForecastRegistry = forecastRegistryAddress;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
  console.log("Updated deployments/testnet.json with ForecastRegistry address.");
}

main().catch((error: unknown) => {
  console.error(error);
  (process as any).exitCode = 1;
});
