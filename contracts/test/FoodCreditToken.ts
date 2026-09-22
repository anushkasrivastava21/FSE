import { expect } from "chai";
import { ethers } from "hardhat";

describe("FoodCreditToken", function () {
  async function deploy() {
    const [admin, settlement, donor, other] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("FoodCreditToken");
    const token = await Factory.deploy();
    await token.waitForDeployment();

    await token.setSettlement(settlement.address);

    return { token, admin, settlement, donor, other };
  }

  it("sets the deployer as admin", async function () {
    const { token, admin } = await deploy();
    const role = await token.DEFAULT_ADMIN_ROLE();
    expect(await token.hasRole(role, admin.address)).to.equal(true);
  });

  it("allows only Settlement to mint", async function () {
    const { token, donor, other } = await deploy();
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-1"));

    await expect(
      token.connect(other).mint(donor.address, matchId, "ipfs://metadata")
    ).to.be.reverted;
  });

  it("mints a Food Credit to the donor", async function () {
    const { token, settlement, donor } = await deploy();
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-1"));

    await token.connect(settlement).mint(donor.address, matchId, "ipfs://metadata");

    expect(await token.ownerOf(1)).to.equal(donor.address);
    expect(await token.tokenByMatchId(matchId)).to.equal(1);
  });

  it("stores the matchId and metadata", async function () {
    const { token, settlement, donor } = await deploy();
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-2"));

    await token.connect(settlement).mint(donor.address, matchId, "ipfs://food-credit-2");

    const credit = await token.credits(1);
    expect(credit.matchId).to.equal(matchId);
    expect(credit.metadataURI).to.equal("ipfs://food-credit-2");
    expect(await token.tokenURI(1)).to.equal("ipfs://food-credit-2");
  });

  it("prevents the same match from being minted twice", async function () {
    const { token, settlement, donor } = await deploy();
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-duplicate"));

    await token.connect(settlement).mint(donor.address, matchId, "ipfs://metadata");

    await expect(
      token.connect(settlement).mint(donor.address, matchId, "ipfs://metadata")
    ).to.be.revertedWith("credit already minted");
  });

  it("blocks normal transfers because the token is soulbound", async function () {
    const { token, settlement, donor, other } = await deploy();
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-transfer"));

    await token.connect(settlement).mint(donor.address, matchId, "ipfs://metadata");

    await expect(
      token.connect(donor).transferFrom(donor.address, other.address, 1)
    ).to.be.revertedWith("Food Credit Token is soulbound");
  });

  it("rejects invalid donor", async function () {
    const { token, settlement } = await deploy();
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("invalid-donor"));

    await expect(
      token.connect(settlement).mint(ethers.ZeroAddress, matchId, "ipfs://metadata")
    ).to.be.revertedWith("invalid donor");
  });

  it("rejects invalid matchId", async function () {
    const { token, settlement, donor } = await deploy();

    await expect(
      token.connect(settlement).mint(donor.address, ethers.ZeroHash, "ipfs://metadata")
    ).to.be.revertedWith("invalid matchId");
  });

  it("reverts setSettlement with a zero address", async function () {
    const { token } = await deploy();

    await expect(
      token.setSettlement(ethers.ZeroAddress)
    ).to.be.revertedWith("invalid settlement address");
  });

  it("allows admin to revoke the settlement role", async function () {
    const { token, settlement, donor } = await deploy();

    await token.revokeSettlement(settlement.address);

    const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-revoked"));

    await expect(
      token.connect(settlement).mint(donor.address, matchId, "ipfs://metadata")
    ).to.be.reverted;
  });

  it("reverts tokenURI for a token that does not exist", async function () {
    const { token } = await deploy();

    await expect(token.tokenURI(999)).to.be.revertedWith("token does not exist");
  });

  it("reports support for the ERC165 interface", async function () {
    const { token } = await deploy();

    expect(await token.supportsInterface("0x01ffc9a7")).to.equal(true);
  });

    it("reverts setSettlement when called by a non-admin", async function () {
    const { token, other } = await deploy();

    await expect(
      token.connect(other).setSettlement(other.address)
    ).to.be.reverted;
  });

  it("reverts revokeSettlement when called by a non-admin", async function () {
    const { token, settlement, other } = await deploy();

    await expect(
      token.connect(other).revokeSettlement(settlement.address)
    ).to.be.reverted;
  });
});