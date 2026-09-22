import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ForecastRegistry", function () {
  // ─── Fixture ──────────────────────────────────────────────────────────────

  async function deployFixture() {
    const [owner, ngo, ngo2, other] = await ethers.getSigners();
    const ForecastRegistry = await ethers.getContractFactory(
      "ForecastRegistry"
    );
    const forecastRegistry = await ForecastRegistry.deploy();
    return { forecastRegistry, owner, ngo, ngo2, other };
  }

  // ─── Deployment ──────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("deploys and has a valid address", async function () {
      const { forecastRegistry } = await loadFixture(deployFixture);
      expect(await forecastRegistry.getAddress()).to.be.properAddress;
    });

    it("sets deployer as owner", async function () {
      const { forecastRegistry, owner } = await loadFixture(deployFixture);
      expect(await forecastRegistry.owner()).to.equal(owner.address);
    });
  });

  // ─── submitForecast ───────────────────────────────────────────────────────

  describe("submitForecast", function () {
    it("stores the forecast and emits ForecastSubmitted", async function () {
      const { forecastRegistry, ngo } = await loadFixture(deployFixture);

      await expect(
        forecastRegistry.connect(ngo).submitForecast(1, 500)
      )
        .to.emit(forecastRegistry, "ForecastSubmitted")
        .withArgs(ngo.address, 1, 500);

      const forecast = await forecastRegistry.forecasts(ngo.address, 1);
      expect(forecast.expectedQuantity).to.equal(500);
      expect(forecast.scored).to.be.false;
    });

    it("allows different NGOs to submit for the same period", async function () {
      const { forecastRegistry, ngo, ngo2 } = await loadFixture(deployFixture);

      await forecastRegistry.connect(ngo).submitForecast(1, 300);
      await forecastRegistry.connect(ngo2).submitForecast(1, 700);

      const f1 = await forecastRegistry.forecasts(ngo.address, 1);
      const f2 = await forecastRegistry.forecasts(ngo2.address, 1);
      expect(f1.expectedQuantity).to.equal(300);
      expect(f2.expectedQuantity).to.equal(700);
    });

    it("allows the same NGO to submit for different periods", async function () {
      const { forecastRegistry, ngo } = await loadFixture(deployFixture);

      await forecastRegistry.connect(ngo).submitForecast(1, 100);
      await forecastRegistry.connect(ngo).submitForecast(2, 200);

      const f1 = await forecastRegistry.forecasts(ngo.address, 1);
      const f2 = await forecastRegistry.forecasts(ngo.address, 2);
      expect(f1.expectedQuantity).to.equal(100);
      expect(f2.expectedQuantity).to.equal(200);
    });

    it("reverts when expectedQuantity is zero", async function () {
      const { forecastRegistry, ngo } = await loadFixture(deployFixture);

      await expect(
        forecastRegistry.connect(ngo).submitForecast(1, 0)
      ).to.be.revertedWith("Invalid quantity");
    });
  });

  // ─── scoreForecast ────────────────────────────────────────────────────────

  describe("scoreForecast", function () {
    async function withForecast() {
      const fixture = await loadFixture(deployFixture);
      await fixture.forecastRegistry
        .connect(fixture.ngo)
        .submitForecast(1, 1000);
      return fixture;
    }

    // Access control
    it("reverts when called by non-owner", async function () {
      const { forecastRegistry, ngo, other } = await withForecast();

      await expect(
        forecastRegistry.connect(other).scoreForecast(ngo.address, 1, 800)
      ).to.be.revertedWithCustomError(forecastRegistry, "OwnableUnauthorizedAccount");
    });

    // Perfect score
    it("scores 100 when actual equals expected", async function () {
      const { forecastRegistry, owner, ngo } = await withForecast();

      await expect(
        forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 1000)
      )
        .to.emit(forecastRegistry, "ForecastScored")
        .withArgs(ngo.address, 1, 100);

      const forecast = await forecastRegistry.forecasts(ngo.address, 1);
      expect(forecast.accuracyScore).to.equal(100);
      expect(forecast.actualQuantity).to.equal(1000);
      expect(forecast.scored).to.be.true;
    });

    // Under-delivery — accuracy = 100 - (200/1000)*100 = 80
    it("computes correct score when actual < expected", async function () {
      const { forecastRegistry, owner, ngo } = await withForecast();

      await forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 800);
      const forecast = await forecastRegistry.forecasts(ngo.address, 1);
      expect(forecast.accuracyScore).to.equal(80);
    });

    // Over-delivery — accuracy = 100 - (200/1000)*100 = 80
    it("computes correct score when actual > expected (symmetric)", async function () {
      const { forecastRegistry, owner, ngo } = await withForecast();

      await forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 1200);
      const forecast = await forecastRegistry.forecasts(ngo.address, 1);
      expect(forecast.accuracyScore).to.equal(80);
    });

    // Clamp to 0 — diff >= expected
    it("clamps score to 0 when deviation >= 100%", async function () {
      const { forecastRegistry, owner, ngo } = await withForecast();

      // actual = 0, diff = 1000, penalty = 100% → score clamped to 0
      await forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 0);
      const forecast = await forecastRegistry.forecasts(ngo.address, 1);
      expect(forecast.accuracyScore).to.equal(0);
    });

    it("clamps score to 0 when actual is double the expected", async function () {
      const { forecastRegistry, owner, ngo } = await withForecast();

      // diff = 1000, penalty = 100% → clamped to 0
      await forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 2000);
      const forecast = await forecastRegistry.forecasts(ngo.address, 1);
      expect(forecast.accuracyScore).to.equal(0);
    });

    // Already scored guard
    it("reverts when trying to score an already-scored forecast", async function () {
      const { forecastRegistry, owner, ngo } = await withForecast();

      await forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 800);
      await expect(
        forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 900)
      ).to.be.revertedWith("Already scored");
    });

    // History tracking
    it("appends accuracy score to ngoAccuracyHistory", async function () {
      const { forecastRegistry, owner, ngo } = await loadFixture(deployFixture);

      await forecastRegistry.connect(ngo).submitForecast(1, 1000);
      await forecastRegistry.connect(ngo).submitForecast(2, 500);
      await forecastRegistry.connect(owner).scoreForecast(ngo.address, 1, 900); // score = 90
      await forecastRegistry.connect(owner).scoreForecast(ngo.address, 2, 400); // score = 80

      const history = await forecastRegistry.getNGOAccuracyHistory(ngo.address);
      expect(history.length).to.equal(2);
      expect(history[0]).to.equal(90);
      expect(history[1]).to.equal(80);
    });
  });

  // ─── getNGOAccuracyHistory ────────────────────────────────────────────────

  describe("getNGOAccuracyHistory", function () {
    it("returns empty array for NGO with no scored forecasts", async function () {
      const { forecastRegistry, ngo } = await loadFixture(deployFixture);
      const history = await forecastRegistry.getNGOAccuracyHistory(ngo.address);
      expect(history.length).to.equal(0);
    });

    it("returns empty array for an unknown address", async function () {
      const { forecastRegistry, other } = await loadFixture(deployFixture);
      const history = await forecastRegistry.getNGOAccuracyHistory(other.address);
      expect(history.length).to.equal(0);
    });
  });
});