const { ethers } = require("hardhat");

async function main() {
  const fs = require("fs");
  const path = require("path");
  const deploymentsPath = path.resolve(__dirname, "../../deployments/testnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8")).localhost;

  const order = await ethers.getContractAt("Order", deployments.Order);
  const tx = await order.registerNGO("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  await tx.wait();
  console.log("NGO Registered!");
}

main().catch(console.error);
