import { expect } from "chai";
import { ethers } from "hardhat";

describe("ForecastRegistry", function () {
  async function deployFixture() {
    const [owner, ngo] = await ethers.getSigners();
    const ForecastRegistry = await ethers.getContractFactory("ForecastRegistry");
    const forecastRegistry = await ForecastRegistry.deploy();
    return { forecastRegistry, owner, ngo };
  }

  it("should deploy successfully", async function () {
    const { forecastRegistry } = await deployFixture();
    expect(await forecastRegistry.getAddress()).to.be.properAddress;
  });
});