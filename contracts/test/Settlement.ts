import { expect } from "chai";
import { ethers } from "hardhat";

describe("Settlement", function () {
  async function deployFixture() {
    const [owner, transporter, donor] = await ethers.getSigners();

    const MockListing = await ethers.getContractFactory("MockListing");
    const listing = await MockListing.deploy();
    await listing.waitForDeployment();

    const MockMatchingEngine = await ethers.getContractFactory("MockMatchingEngine");
    const matchingEngine = await MockMatchingEngine.deploy();
    await matchingEngine.waitForDeployment();

    const FoodCreditToken = await ethers.getContractFactory("FoodCreditToken");
    const foodCreditToken = await FoodCreditToken.deploy();
    await foodCreditToken.waitForDeployment();

    const Settlement = await ethers.getContractFactory("Settlement");
    const settlement = await Settlement.deploy(
      owner.address,
      await matchingEngine.getAddress(),
      await listing.getAddress(),
      await foodCreditToken.getAddress()
    );
    await settlement.waitForDeployment();

    await foodCreditToken.setSettlement(await settlement.getAddress());

    return { owner, transporter, donor, listing, matchingEngine, foodCreditToken, settlement };
  }

  it("sets the correct contract addresses", async function () {
    const { settlement, matchingEngine, listing, foodCreditToken } = await deployFixture();

    expect(await settlement.matchingEngine()).to.equal(await matchingEngine.getAddress());
    expect(await settlement.listing()).to.equal(await listing.getAddress());
    expect(await settlement.foodCreditToken()).to.equal(await foodCreditToken.getAddress());
  });

  it("rejects a zero matching engine address", async function () {
    const [owner] = await ethers.getSigners();

    const MockListing = await ethers.getContractFactory("MockListing");
    const listing = await MockListing.deploy();
    await listing.waitForDeployment();

    const FoodCreditToken = await ethers.getContractFactory("FoodCreditToken");
    const foodCreditToken = await FoodCreditToken.deploy();
    await foodCreditToken.waitForDeployment();

    const Settlement = await ethers.getContractFactory("Settlement");

    await expect(
      Settlement.deploy(
        owner.address,
        ethers.ZeroAddress,
        await listing.getAddress(),
        await foodCreditToken.getAddress()
      )
    ).to.be.revertedWith("invalid matching engine");
  });

  it("rejects a zero listing address", async function () {
    const [owner] = await ethers.getSigners();

    const MockMatchingEngine = await ethers.getContractFactory("MockMatchingEngine");
    const matchingEngine = await MockMatchingEngine.deploy();
    await matchingEngine.waitForDeployment();

    const FoodCreditToken = await ethers.getContractFactory("FoodCreditToken");
    const foodCreditToken = await FoodCreditToken.deploy();
    await foodCreditToken.waitForDeployment();

    const Settlement = await ethers.getContractFactory("Settlement");

    await expect(
      Settlement.deploy(
        owner.address,
        await matchingEngine.getAddress(),
        ethers.ZeroAddress,
        await foodCreditToken.getAddress()
      )
    ).to.be.revertedWith("invalid listing");
  });

  it("rejects a zero FoodCreditToken address", async function () {
    const [owner] = await ethers.getSigners();

    const MockListing = await ethers.getContractFactory("MockListing");
    const listing = await MockListing.deploy();
    await listing.waitForDeployment();

    const MockMatchingEngine = await ethers.getContractFactory("MockMatchingEngine");
    const matchingEngine = await MockMatchingEngine.deploy();
    await matchingEngine.waitForDeployment();

    const Settlement = await ethers.getContractFactory("Settlement");

    await expect(
      Settlement.deploy(
        owner.address,
        await matchingEngine.getAddress(),
        await listing.getAddress(),
        ethers.ZeroAddress
      )
    ).to.be.revertedWith("invalid food credit token");
  });

  it("rejects a handoff for an invalid matchId", async function () {
    const { settlement, transporter } = await deployFixture();

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("invalid-match"));

    await expect(
      settlement.recordHandoff(matchId, 0, transporter.address)
    ).to.be.revertedWith("bad matchId");
  });

  it("rejects a zero actor address", async function () {
    const { settlement, matchingEngine, transporter } = await deployFixture();

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("test-match"));
    await matchingEngine.setMatch(matchId, 1, 1, 100);

    await expect(
      settlement.recordHandoff(matchId, 0, ethers.ZeroAddress)
    ).to.be.revertedWith("invalid actor");
  });

  it("requires the first handoff to be PickedUp", async function () {
    const { settlement, matchingEngine, transporter } = await deployFixture();

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-order"));
    await matchingEngine.setMatch(matchId, 1, 1, 100);

    await expect(
      settlement.recordHandoff(matchId, 1, transporter.address)
    ).to.be.revertedWith("must start with pickup");
  });

  it("records the full PickedUp -> InTransit -> Delivered flow and mints a token", async function () {
    const { settlement, matchingEngine, listing, foodCreditToken, transporter, donor } =
      await deployFixture();

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-full-flow"));
    await matchingEngine.setMatch(matchId, 1, 1, 100);
    await listing.setListing(1, donor.address, "ipfs://food-metadata");

    await settlement.recordHandoff(matchId, 0, transporter.address);
    await settlement.recordHandoff(matchId, 1, transporter.address);
    await settlement.recordHandoff(matchId, 2, transporter.address);

    const handoffs = await settlement.getHandoffs(matchId);
    expect(handoffs.length).to.equal(3);
    expect(handoffs[0].stage).to.equal(0);
    expect(handoffs[1].stage).to.equal(1);
    expect(handoffs[2].stage).to.equal(2);

    expect(await foodCreditToken.ownerOf(1)).to.equal(donor.address);
  });

  it("rejects skipping a custody stage", async function () {
    const { settlement, matchingEngine, transporter } = await deployFixture();

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-skip"));
    await matchingEngine.setMatch(matchId, 1, 1, 100);

    await settlement.recordHandoff(matchId, 0, transporter.address);

    await expect(
      settlement.recordHandoff(matchId, 2, transporter.address)
    ).to.be.revertedWith("invalid stage transition");
  });

  it("rejects repeating the same custody stage", async function () {
    const { settlement, matchingEngine, transporter } = await deployFixture();

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-repeat"));
    await matchingEngine.setMatch(matchId, 1, 1, 100);

    await settlement.recordHandoff(matchId, 0, transporter.address);

    await expect(
      settlement.recordHandoff(matchId, 0, transporter.address)
    ).to.be.revertedWith("invalid stage transition");
  });

  it("returns an empty handoff history for an unknown match", async function () {
    const { settlement } = await deployFixture();

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("unknown-match"));
    const handoffs = await settlement.getHandoffs(matchId);

    expect(handoffs.length).to.equal(0);
  });
});