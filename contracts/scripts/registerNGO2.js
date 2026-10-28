const { ethers } = require("hardhat");

async function main() {
  const fs = require("fs");
  const path = require("path");
  const deploymentsPath = path.resolve(__dirname, "../../deployments/testnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8")).localhost;

  const order = await ethers.getContractAt("Order", deployments.Order);
  
  // Grant NGO role to the second Hardhat account
  const tx = await order.registerNGO("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  await tx.wait();
  
  console.log("Account 2 is now registered as an NGO!");
}

main().catch(console.error);
