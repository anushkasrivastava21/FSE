const { ethers } = require("hardhat");

async function main() {
  const fs = require("fs");
  const path = require("path");
  const deploymentsPath = path.resolve(__dirname, "../../deployments/testnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8")).localhost;

  const listingContract = await ethers.getContractAt("Listing", deployments.Listing);
  const orderContract = await ethers.getContractAt("Order", deployments.Order);
  const matchingEngine = await ethers.getContractAt("MatchingEngine", deployments.MatchingEngine);

  const nextListingId = await listingContract.nextListingId();
  const nextOrderId = await orderContract.nextOrderId();

  if (nextListingId <= 1 || nextOrderId <= 1) {
    console.log("No listings or orders available to match.");
    return;
  }

  // We take the most recently created listing and order
  const lId = nextListingId - 1n;
  const oId = nextOrderId - 1n;

  // Verify they are still Open
  const listingData = await listingContract.getListing(lId);
  const orderData = await orderContract.getOrder(oId);

  if (listingData.status !== 0n) {
    console.log(`Listing ${lId} is not Open.`);
    return;
  }
  if (orderData.status !== 0n) {
    console.log(`Order ${oId} is not Open.`);
    return;
  }
  if (listingData.locationHash !== orderData.locationHash) {
    console.log(`Location mismatch! Listing Pincode vs Order Pincode. Make sure you use the SAME pincode for both.`);
    return;
  }

  // Compute weight
  const weight = await matchingEngine.computeUrgency(lId);

  console.log(`Executing Match: Listing ${lId} <-> Order ${oId} with weight ${weight}`);
  const tx = await matchingEngine.matchOrders([lId], [oId], [weight], [0]);
  await tx.wait();

  console.log("Match Executed successfully! Check the dashboard.");
}

main().catch(console.error);
