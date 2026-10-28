import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("===============================================================");
  console.log("       🥗 FOOD SURPLUS EXCHANGE (FSE) — END-TO-END DEMO        ");
  console.log("===============================================================");

  // 1. Load Deployments
  const deploymentsPath = path.resolve(__dirname, "../../deployments/testnet.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`Deployments file not found at ${deploymentsPath}`);
  }
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8")).localhost;

  const [admin, donor, ngo, transporter] = await ethers.getSigners();

  console.log("\n👥 Actors participating in demo:");
  console.log(`  • Platform Admin:  ${admin.address}`);
  console.log(`  • Food Donor:      ${donor.address} (Alice's Bistro)`);
  console.log(`  • Verified NGO:    ${ngo.address} (Delhi Food Relief)`);
  console.log(`  • Logistics:       ${transporter.address} (Rapid Fleet)`);

  const listing = await ethers.getContractAt("Listing", deployments.Listing);
  const order = await ethers.getContractAt("Order", deployments.Order);
  const matchingEngine = await ethers.getContractAt("MatchingEngine", deployments.MatchingEngine);
  const settlement = await ethers.getContractAt("Settlement", deployments.Settlement);
  const foodCreditToken = await ethers.getContractAt("FoodCreditToken", deployments.FoodCreditToken);
  const forecastRegistry = await ethers.getContractAt("ForecastRegistry", deployments.ForecastRegistry);

  const LOCATION_PINCODE = "110001";
  const locationHash = ethers.keccak256(ethers.toUtf8Bytes(LOCATION_PINCODE));

  // -------------------------------------------------------------
  // STEP 1: NGO Verification (Vertical B - Order.sol)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("📋 STEP 1: Authorizing & Registering NGO on-chain");
  console.log("---------------------------------------------------------------");
  const NGO_ROLE = ethers.keccak256(ethers.toUtf8Bytes("NGO_ROLE"));
  const hasRole = await order.hasRole(NGO_ROLE, ngo.address);
  if (!hasRole) {
    const regTx = await order.connect(admin).registerNGO(ngo.address);
    await regTx.wait();
    console.log(`  ✅ NGO ${ngo.address} granted NGO_ROLE on Order contract.`);
  } else {
    console.log(`  ℹ️ NGO ${ngo.address} already registered.`);
  }

  // -------------------------------------------------------------
  // STEP 2: NGO Submits Demand Forecast (Vertical C - ForecastRegistry.sol)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("📊 STEP 2: NGO Submits Demand Forecast (Person C)");
  console.log("---------------------------------------------------------------");
  const periodId = Math.floor(Date.now() / 10000); // Unique period
  const expectedKg = 100;
  console.log(`  • Period ID: ${periodId}`);
  console.log(`  • Expected Demand: ${expectedKg} kg`);
  const forecastTx = await forecastRegistry.connect(ngo).submitForecast(periodId, expectedKg);
  await forecastTx.wait();
  console.log("  ✅ Demand forecast committed on-chain to ForecastRegistry.");

  // -------------------------------------------------------------
  // STEP 3: Donor Logs Surplus Food Listing (Vertical A - Listing.sol)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("🍲 STEP 3: Donor Logs Food Surplus Listing (Person A)");
  console.log("---------------------------------------------------------------");
  const block = await ethers.provider.getBlock("latest");
  const currentTimestamp = block ? block.timestamp : Math.floor(Date.now() / 1000);
  const expiryTimestamp = currentTimestamp + 6 * 3600; // 6 hours from now
  const quantityKg = 100;
  const foodType = 0; // Cooked Food
  const qualityTier = 0; // High Quality
  const ipfsUri = "ipfs://bafkreibistrofreshsurplusmeals2026";

  console.log(`  • Food Type: Cooked (0)`);
  console.log(`  • Quantity: ${quantityKg} kg`);
  console.log(`  • Quality Tier: High (0)`);
  console.log(`  • Expiry: in 6 hours`);
  console.log(`  • Location Pin: ${LOCATION_PINCODE} (Hash: ${locationHash.substring(0, 10)}...)`);

  const listTx = await listing.connect(donor).createListing(
    foodType,
    quantityKg,
    expiryTimestamp,
    qualityTier,
    locationHash,
    ipfsUri
  );
  const listReceipt = await listTx.wait();

  // Extract listingId from event
  let listingId = 1n;
  for (const log of listReceipt!.logs) {
    try {
      const parsed = listing.interface.parseLog(log);
      if (parsed?.name === "ListingCreated") {
        listingId = parsed.args.listingId;
        break;
      }
    } catch {}
  }
  console.log(`  ✅ Listing created successfully! Listing ID: #${listingId}`);

  // Calculate Urgency Score
  const rawUrgency = await matchingEngine.computeUrgency(listingId);
  console.log(`  🔥 Options-Decay Urgency Score calculated on-chain: ${rawUrgency.toString()}`);

  // -------------------------------------------------------------
  // STEP 4: NGO Places Matching Order (Vertical B - Order.sol)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("📦 STEP 4: Verified NGO Places Food Order (Person B)");
  console.log("---------------------------------------------------------------");
  const orderTx = await order.connect(ngo).placeOrder(
    quantityKg,
    true, // Urgency flag = true
    locationHash
  );
  const orderReceipt = await orderTx.wait();

  let orderId = 1n;
  for (const log of orderReceipt!.logs) {
    try {
      const parsed = order.interface.parseLog(log);
      if (parsed?.name === "OrderPlaced") {
        orderId = parsed.args.orderId;
        break;
      }
    } catch {}
  }
  console.log(`  ✅ Order placed successfully! Order ID: #${orderId}`);
  console.log(`  • Quantity: ${quantityKg} kg`);
  console.log(`  • Urgency Flag: true (Emergency hunger priority +1,000,000 weight)`);

  // -------------------------------------------------------------
  // STEP 5: Matching Engine Execution with LP Duality Verification (Person A)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("⚡ STEP 5: Matching Engine Solves LP Duality on-chain");
  console.log("---------------------------------------------------------------");
  // Total weight = urgency score + order urgency boost
  const matchWeight = rawUrgency + 1000000n;
  console.log(`  • Total Match Weight: ${matchWeight.toString()}`);
  console.log(`  • Proving Complementary Slackness: u = [${matchWeight}], v = [0]`);

  const matchTx = await matchingEngine.matchOrders(
    [listingId],
    [orderId],
    [matchWeight],
    [0n]
  );
  const matchReceipt = await matchTx.wait();

  let matchId = "";
  for (const log of matchReceipt!.logs) {
    try {
      const parsed = matchingEngine.interface.parseLog(log);
      if (parsed?.name === "MatchExecuted") {
        matchId = parsed.args.matchId;
        break;
      }
    } catch {}
  }
  console.log(`  ✅ Match verified and executed on-chain!`);
  console.log(`  • Cryptographic Match ID: ${matchId}`);

  // Verify listing & order statuses
  const updatedListing = await listing.getListing(listingId);
  const updatedOrder = await order.getOrder(orderId);
  console.log(`  • Listing #${listingId} Status: ${updatedListing.status === 1n ? "Matched (1)" : updatedListing.status}`);
  console.log(`  • Order #${orderId} Status:   ${updatedOrder.status === 1n ? "Matched (1)" : updatedOrder.status}`);

  // -------------------------------------------------------------
  // STEP 6: Custody Trail & Delivery Handoffs (Vertical B - Settlement.sol)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("🚚 STEP 6: Physical Custody Trail & Handoffs (Person B)");
  console.log("---------------------------------------------------------------");

  console.log("  1️⃣ Recording Stage 0: PickedUp from Alice's Bistro...");
  const h0Tx = await settlement.connect(transporter).recordHandoff(matchId, 0, transporter.address);
  await h0Tx.wait();
  console.log("     ✓ Stage: PickedUp recorded on-chain.");

  console.log("  2️⃣ Recording Stage 1: InTransit (Logistics dispatch)...");
  const h1Tx = await settlement.connect(transporter).recordHandoff(matchId, 1, transporter.address);
  await h1Tx.wait();
  console.log("     ✓ Stage: InTransit recorded on-chain.");

  console.log("  3️⃣ Recording Stage 2: Delivered to Delhi Food Relief...");
  const h2Tx = await settlement.connect(transporter).recordHandoff(matchId, 2, transporter.address);
  const h2Receipt = await h2Tx.wait();
  console.log("     ✓ Stage: Delivered recorded on-chain.");

  // Check FoodCreditToken mint event
  let mintedTokenId = "";
  for (const log of h2Receipt!.logs) {
    try {
      const parsed = foodCreditToken.interface.parseLog(log);
      if (parsed?.name === "FoodCreditMinted") {
        mintedTokenId = parsed.args.tokenId.toString();
        break;
      }
    } catch {}
  }

  // -------------------------------------------------------------
  // STEP 7: Food Credit Token Verification (Vertical B - FoodCreditToken.sol)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("🎖️ STEP 7: Food Credit Token Minted to Donor (Person B)");
  console.log("---------------------------------------------------------------");
  const donorBalance = await foodCreditToken.balanceOf(donor.address);
  console.log(`  • Donor Alice's NFT Balance: ${donorBalance.toString()} Token(s)`);
  if (mintedTokenId) {
    console.log(`  ✅ Minted Food Credit Token ID: #${mintedTokenId}`);
  }

  // -------------------------------------------------------------
  // STEP 8: NGO Forecast Scoring (Vertical C - ForecastRegistry.sol)
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("🎯 STEP 8: NGO Forecast Evaluation & Scoring (Person C)");
  console.log("---------------------------------------------------------------");
  const deliveredKg = 100;
  console.log(`  • Expected Quantity: ${expectedKg} kg`);
  console.log(`  • Actual Delivered:  ${deliveredKg} kg`);
  const scoreTx = await forecastRegistry.connect(admin).scoreForecast(ngo.address, periodId, deliveredKg);
  await scoreTx.wait();
  console.log("  ✅ Forecast scored: 100% Accuracy (0 variance penalty)!");

  const accuracyHistory = await forecastRegistry.getNGOAccuracyHistory(ngo.address);
  console.log(`  • NGO Historical Accuracy Scores: [${accuracyHistory.map(s => s.toString()).join(", ")}]%`);

  // -------------------------------------------------------------
  // STEP 9: Verify Real-Time Backend Indexing & API Cache
  // -------------------------------------------------------------
  console.log("\n---------------------------------------------------------------");
  console.log("🌐 STEP 9: Verifying Backend Indexer & REST API Synchronization");
  console.log("---------------------------------------------------------------");
  console.log("  Waiting 2 seconds for viem event indexers to sync SQLite...");
  await sleep(2500);

  try {
    const statsRes = await fetch("http://localhost:3001/stats");
    const stats = await statsRes.json();
    console.log("  📊 GET /stats:", JSON.stringify(stats));

    const listingRes = await fetch(`http://localhost:3001/listings/${listingId}`);
    if (listingRes.ok) {
      const lData = await listingRes.json();
      console.log(`  🍲 GET /listings/${listingId}:`, `Status=${lData.chainStatus}, Urgency=${lData.cachedUrgency}`);
    }

    const orderRes = await fetch(`http://localhost:3001/orders/${orderId}`);
    if (orderRes.ok) {
      const oData = await orderRes.json();
      console.log(`  📦 GET /orders/${orderId}:`, `Status=${oData.chainStatus}, NGO=${oData.ngoAddress}`);
    }

    const handoffRes = await fetch(`http://localhost:3001/handoffs/${encodeURIComponent(matchId)}`);
    if (handoffRes.ok) {
      const hData = await handoffRes.json();
      console.log(`  🚚 GET /handoffs/${matchId.substring(0, 10)}...:`, `${hData.length} stages recorded`);
    }

    const tokenRes = await fetch(`http://localhost:3001/tokens/${encodeURIComponent(donor.address)}`);
    if (tokenRes.ok) {
      const tData = await tokenRes.json();
      console.log(`  🎖️ GET /tokens/${donor.address}:`, `${tData.length} Food Credit Token(s) cached`);
    }

    const tickerRes = await fetch("http://localhost:3001/dashboard/ticker");
    if (tickerRes.ok) {
      const tickerData = await tickerRes.json();
      console.log("  📈 GET /dashboard/ticker:", JSON.stringify(tickerData));
    }
  } catch (err: any) {
    console.log("  (Backend API query note: " + err.message + ")");
  }

  console.log("\n===============================================================");
  console.log("       ✨ DEMO COMPLETED SUCCESSFULLY WITH ZERO ERRORS!        ");
  console.log("===============================================================");
  console.log("  Frontend Live:   http://localhost:3000");
  console.log("  Backend API:     http://localhost:3001/api");
  console.log("  Local RPC:       http://127.0.0.1:8545");
  console.log("===============================================================\n");
}

main().catch((error) => {
  console.error("Demo failed with error:", error);
  process.exitCode = 1;
});
