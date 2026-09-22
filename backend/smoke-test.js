const { ethers } = require('ethers');
const deployments = require('../deployments/testnet.json');

const ListingABI = require('../shared/abi/Listing.json');
const OrderABI = require('../shared/abi/Order.json');
const MatchingABI = require('../shared/abi/MatchingEngine.json');
const SettlementABI = require('../shared/abi/Settlement.json');
const ForecastABI = require('../shared/abi/ForecastRegistry.json');

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = await provider.getSigner(0);
  const donor = await provider.getSigner(1);
  const ngo = await provider.getSigner(2);
  const transporter = await provider.getSigner(3);

  const addrs = deployments.localhost;

  const listing = new ethers.Contract(addrs.Listing, ListingABI, signer);
  const order = new ethers.Contract(addrs.Order, OrderABI, signer);
  const matching = new ethers.Contract(addrs.MatchingEngine, MatchingABI, signer);
  const settlement = new ethers.Contract(addrs.Settlement, SettlementABI, signer);
  const forecast = new ethers.Contract(addrs.ForecastRegistry, ForecastABI, signer);

  const NGO_ROLE = ethers.id('NGO_ROLE');
  const TRANSPORTER_ROLE = ethers.id('TRANSPORTER_ROLE');

  console.log('0. Granting roles to signer...');
  let tx = await order.grantRole(NGO_ROLE, await signer.getAddress());
  await tx.wait();

  console.log('1. Creating Listing...');
  tx = await listing.createListing(
    0, // PERISHABLE
    100,
    Math.floor(Date.now() / 1000) + 86400,
    2, // EXCELLENT
    ethers.id('hash123'),
    'ipfs://listing1'
  );
  let receipt = await tx.wait();
  let event = receipt.logs.find(l => {
    try { return listing.interface.parseLog(l)?.name === 'ListingCreated'; }
    catch { return false; }
  });
  const listingId = listing.interface.parseLog(event).args.listingId;
  console.log('Listing ID:', listingId);

  console.log('2. Placing Order...');
  tx = await order.placeOrder(
    100,
    true,
    ethers.id('hash123')
  );
  receipt = await tx.wait();
  event = receipt.logs.find(l => {
    try { return order.interface.parseLog(l)?.name === 'OrderPlaced'; }
    catch { return false; }
  });
  const orderId = order.interface.parseLog(event).args.orderId;
  console.log('Order ID:', orderId);

  console.log('3. Submitting Forecast...');
  tx = await forecast.submitForecast(
    listingId,
    150
  );
  await tx.wait();

  console.log('4. Matching Order...');
  const weight = await matching.computeUrgency(listingId);
  const finalWeight = weight + 1000000n; // because order has urgencyFlag = true
  tx = await matching.matchOrders([listingId], [orderId], [finalWeight], [0]);
  receipt = await tx.wait();
  // Find matchId from event
  const matchEvent = receipt.logs.find(l => {
    try { return matching.interface.parseLog(l)?.name === 'MatchExecuted'; }
    catch { return false; }
  });
  const matchId = matching.interface.parseLog(matchEvent).args.matchId;
  console.log('Matched with ID:', matchId);

  console.log('5. Recording Handoff (Picked Up)...');
  tx = await settlement.recordHandoff(
    matchId,
    0,
    await signer.getAddress() // actor
  );
  await tx.wait();

  console.log('6. Recording Handoff (Delivered)...');
  // Need InTransit before Delivered
  tx = await settlement.recordHandoff(
    matchId,
    1,
    await signer.getAddress() // actor
  );
  await tx.wait();
  tx = await settlement.recordHandoff(
    matchId,
    2,
    await signer.getAddress() // actor
  );
  await tx.wait();

  console.log('Smoke test txs completed.');
}

main().catch(console.error);
