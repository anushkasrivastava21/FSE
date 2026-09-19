import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { Listing, MatchingEngine, MockOrder } from "../typechain-types";

describe("Phase 1: Listing and MatchingEngine (Bipartite LP Duality)", function () {
    async function deployFixture() {
        const [owner, donor, donor2, matcher, settlement, otherUser] = await ethers.getSigners();

        const Listing = await ethers.getContractFactory("Listing");
        const listing = await Listing.deploy();

        const MockOrder = await ethers.getContractFactory("MockOrder");
        const order = await MockOrder.deploy();

        const MatchingEngine = await ethers.getContractFactory("MatchingEngine");
        const matchingEngine = await MatchingEngine.deploy(await listing.getAddress(), await order.getAddress());

        await listing.setAuthorizedContracts(await matchingEngine.getAddress(), settlement.address);

        return { listing, matchingEngine, order, owner, donor, donor2, matcher, settlement, otherUser };
    }

    // ─── Helper ──────────────────────────────────────────────────────────────
    const LOCATION_HASH = ethers.keccak256(ethers.toUtf8Bytes("110001"));
    const LOCATION_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("560001"));

    // ═════════════════════════════════════════════════════════════════════════
    //  Listing.sol
    // ═════════════════════════════════════════════════════════════════════════
    describe("Listing.sol", function () {
        it("should create a listing and emit ListingCreated", async function () {
            const { listing, donor } = await loadFixture(deployFixture);
            const expiry = (await time.latest()) + 86400; // +1 day

            await expect(listing.connect(donor).createListing(0, 100, expiry, 0, LOCATION_HASH, "ipfs://test"))
                .to.emit(listing, "ListingCreated")
                .withArgs(1, donor.address, expiry);

            const l = await listing.getListing(1);
            expect(l.donor).to.equal(donor.address);
            expect(l.status).to.equal(0); // Open
            expect(l.quantity).to.equal(100);
            expect(l.foodType).to.equal(0);
        });

        it("should revert createListing when expiry is in the past", async function () {
            const { listing, donor } = await loadFixture(deployFixture);
            const pastExpiry = (await time.latest()) - 100;

            await expect(
                listing.connect(donor).createListing(0, 50, pastExpiry, 1, LOCATION_HASH, "ipfs://old")
            ).to.be.revertedWith("Listing: expiry must be in the future");
        });

        it("should revert createListing when quantity is 0", async function () {
            const { listing, donor } = await loadFixture(deployFixture);
            const expiry = (await time.latest()) + 86400;

            await expect(
                listing.connect(donor).createListing(0, 0, expiry, 0, LOCATION_HASH, "ipfs://zero")
            ).to.be.revertedWith("Listing: quantity must be positive");
        });

        it("should allow donor to cancel their own Open listing", async function () {
            const { listing, donor } = await loadFixture(deployFixture);
            const expiry = (await time.latest()) + 86400;

            await listing.connect(donor).createListing(0, 50, expiry, 0, LOCATION_HASH, "ipfs://cancel");

            await expect(listing.connect(donor).cancelListing(1))
                .to.emit(listing, "ListingCancelled")
                .withArgs(1);

            const l = await listing.getListing(1);
            expect(l.status).to.equal(4); // Cancelled
        });

        it("should revert cancelListing when caller is not the donor", async function () {
            const { listing, donor, otherUser } = await loadFixture(deployFixture);
            const expiry = (await time.latest()) + 86400;

            await listing.connect(donor).createListing(0, 50, expiry, 0, LOCATION_HASH, "ipfs://auth");

            await expect(
                listing.connect(otherUser).cancelListing(1)
            ).to.be.revertedWith("Listing: only donor can cancel");
        });

        it("should revert cancelListing when listing is already Matched", async function () {
            const { listing, matchingEngine, order, donor } = await loadFixture(deployFixture);
            const expiry = (await time.latest()) + 86400;

            // Create listing + mock order, then match
            await listing.connect(donor).createListing(0, 100, expiry, 0, LOCATION_HASH, "ipfs://matched");
            await order.setMockOrder(1, donor.address, 100, false, LOCATION_HASH, 0, await time.latest());

            const weight = await matchingEngine.computeUrgency(1);
            await matchingEngine.matchOrders([1], [1], [weight], [0]);

            // Now try to cancel the matched listing
            await expect(
                listing.connect(donor).cancelListing(1)
            ).to.be.revertedWith("Listing: only Open listings can be cancelled");
        });
    });

    // ═════════════════════════════════════════════════════════════════════════
    //  MatchingEngine.sol — Urgency Score
    // ═════════════════════════════════════════════════════════════════════════
    describe("MatchingEngine.sol — computeUrgency", function () {
        it("should return higher urgency for nearer expiry", async function () {
            const { listing, matchingEngine, donor } = await loadFixture(deployFixture);
            const now = await time.latest();

            // Listing 1: expires in 1 hour
            await listing.connect(donor).createListing(0, 50, now + 3600, 0, LOCATION_HASH, "ipfs://near");
            // Listing 2: expires in 24 hours
            await listing.connect(donor).createListing(0, 50, now + 86400, 0, LOCATION_HASH, "ipfs://far");

            const urgencyNear = await matchingEngine.computeUrgency(1);
            const urgencyFar = await matchingEngine.computeUrgency(2);

            expect(urgencyNear).to.be.greaterThan(urgencyFar);
        });

        it("should return higher urgency for higher quality tier", async function () {
            const { listing, matchingEngine, donor } = await loadFixture(deployFixture);
            const expiry = (await time.latest()) + 86400;

            // Listing 1: High quality (tier 0 → factor = 3)
            await listing.connect(donor).createListing(0, 50, expiry, 0, LOCATION_HASH, "ipfs://high");
            // Listing 2: Low quality (tier 2 → factor = 1)
            await listing.connect(donor).createListing(0, 50, expiry, 2, LOCATION_HASH, "ipfs://low");

            const urgencyHigh = await matchingEngine.computeUrgency(1);
            const urgencyLow = await matchingEngine.computeUrgency(2);

            expect(urgencyHigh).to.be.greaterThan(urgencyLow);
        });
    });

    // ═════════════════════════════════════════════════════════════════════════
    //  MatchingEngine.sol — matchOrders (LP Duality)
    // ═════════════════════════════════════════════════════════════════════════
    describe("MatchingEngine.sol — matchOrders (LP Duality)", function () {
        it("should execute an optimal bipartite match successfully", async function () {
            const { listing, matchingEngine, order, donor } = await loadFixture(deployFixture);

            const expiry = (await time.latest()) + 86400;
            await listing.connect(donor).createListing(0, 100, expiry, 0, LOCATION_HASH, "ipfs://test");
            await order.setMockOrder(1, donor.address, 100, false, LOCATION_HASH, 0, await time.latest());

            const weight = await matchingEngine.computeUrgency(1);
            const u = [weight];
            const v = [0n];

            await expect(matchingEngine.matchOrders([1], [1], u, v))
                .to.emit(matchingEngine, "MatchExecuted");

            const l = await listing.getListing(1);
            expect(l.status).to.equal(1); // Matched
        });

        it("should reject sub-optimal matching (LP Duality violated)", async function () {
            const { listing, matchingEngine, order, donor } = await loadFixture(deployFixture);

            const expiry = (await time.latest()) + 86400;
            await listing.connect(donor).createListing(0, 100, expiry, 0, LOCATION_HASH, "ipfs://test");
            await order.setMockOrder(1, donor.address, 100, false, LOCATION_HASH, 0, await time.latest());

            // Wrong dual potentials — too low
            const u = [100000n];
            const v = [0n];

            await expect(matchingEngine.matchOrders([1], [1], u, v))
                .to.be.revertedWith("LP Duality: Sub-optimal match submitted");
        });

        it("should reject region-mismatched pair (weight = 0, slackness violated)", async function () {
            const { listing, matchingEngine, order, donor } = await loadFixture(deployFixture);

            const expiry = (await time.latest()) + 86400;
            // Listing in region 110001
            await listing.connect(donor).createListing(0, 100, expiry, 0, LOCATION_HASH, "ipfs://r1");
            // Order in region 560001 — different region
            await order.setMockOrder(1, donor.address, 100, false, LOCATION_HASH_2, 0, await time.latest());

            // Weight will be 0 because location mismatch. Complementary slackness requires
            // u[0] + v[0] == weight == 0, so u=[0], v=[0]. But then "Cannot execute a 0-weight match".
            await expect(matchingEngine.matchOrders([1], [1], [0], [0]))
                .to.be.revertedWith("Cannot execute a 0-weight match");
        });

        it("should revert on empty batch", async function () {
            const { matchingEngine } = await loadFixture(deployFixture);

            await expect(matchingEngine.matchOrders([], [], [], []))
                .to.be.revertedWith("Empty batch");
        });

        it("should update both listing and order status to Matched after successful match", async function () {
            const { listing, matchingEngine, order, donor } = await loadFixture(deployFixture);

            const expiry = (await time.latest()) + 86400;
            await listing.connect(donor).createListing(0, 80, expiry, 1, LOCATION_HASH, "ipfs://status");
            await order.setMockOrder(1, donor.address, 80, false, LOCATION_HASH, 0, await time.latest());

            const weight = await matchingEngine.computeUrgency(1);
            await matchingEngine.matchOrders([1], [1], [weight], [0]);

            // Listing status = Matched (1)
            const l = await listing.getListing(1);
            expect(l.status).to.equal(1);

            // Order status = Matched (1)
            const o = await order.getOrder(1);
            expect(o.status).to.equal(1);
        });
    });
});
