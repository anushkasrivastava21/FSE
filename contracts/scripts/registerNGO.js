const { ethers } = require("hardhat");

async function main() {
  const order = await ethers.getContractAt("Order", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
  const tx = await order.registerNGO("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  await tx.wait();
  console.log("NGO Registered!");
}

main().catch(console.error);
