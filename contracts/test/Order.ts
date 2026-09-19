import { expect } from "chai";

import { ethers } from "hardhat";

describe("Order", function () {
  async function deployOrder() {
    const [admin, ngo, other] = await ethers.getSigners();

    const Order = await ethers.getContractFactory("Order");

    const order = await Order.deploy();

    return { order, admin, ngo, other };
  }

  it("sets the deployer as the admin", async function () {
    const { order, admin } = await deployOrder();

    const DEFAULT_ADMIN_ROLE = await order.DEFAULT_ADMIN_ROLE();

    expect(
      await order.hasRole(DEFAULT_ADMIN_ROLE, admin.address)
    ).to.equal(true);
  });

  it("allows admin to register an NGO", async function () {
    const { order, ngo } = await deployOrder();

    await order.registerNGO(ngo.address);

    const NGO_ROLE = await order.NGO_ROLE();

    expect(
      await order.hasRole(NGO_ROLE, ngo.address)
    ).to.equal(true);
  });

  it("allows a registered NGO to place an order", async function () {
    const { order, ngo } = await deployOrder();

    await order.registerNGO(ngo.address);

    const quantity = 100;
    const urgencyFlag = true;
    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await expect(
      order.connect(ngo).placeOrder(
        quantity,
        urgencyFlag,
        locationHash
      )
    )
      .to.emit(order, "OrderPlaced")
      .withArgs(
        1,
        ngo.address,
        quantity,
        urgencyFlag,
        locationHash
      );

    const savedOrder = await order.getOrder(1);

    expect(savedOrder.ngoAddress).to.equal(ngo.address);
    expect(savedOrder.quantity).to.equal(quantity);
    expect(savedOrder.urgencyFlag).to.equal(urgencyFlag);
    expect(savedOrder.locationHash).to.equal(locationHash);
    expect(savedOrder.status).to.equal(0);
  });

  it("rejects an order from an address without NGO role", async function () {
    const { order, other } = await deployOrder();

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await expect(
      order.connect(other).placeOrder(
        100,
        false,
        locationHash
      )
    ).to.be.reverted;
  });

  it("rejects an order with zero quantity", async function () {
    const { order, ngo } = await deployOrder();

    await order.registerNGO(ngo.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await expect(
      order.connect(ngo).placeOrder(
        0,
        false,
        locationHash
      )
    ).to.be.revertedWith(
      "quantity must be greater than zero"
    );
  });

  it("allows the NGO to cancel its own open order", async function () {
    const { order, ngo } = await deployOrder();

    await order.registerNGO(ngo.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await order.connect(ngo).placeOrder(
      100,
      false,
      locationHash
    );

    await expect(
      order.connect(ngo).cancelOrder(1)
    )
      .to.emit(order, "OrderCancelled")
      .withArgs(1);

    const savedOrder = await order.getOrder(1);

    expect(savedOrder.status).to.equal(2);
  });

  it("prevents another address from cancelling the order", async function () {
    const { order, ngo, other } = await deployOrder();

    await order.registerNGO(ngo.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await order.connect(ngo).placeOrder(
      100,
      false,
      locationHash
    );

    await expect(
      order.connect(other).cancelOrder(1)
    ).to.be.revertedWith("not order owner");
  });

  it("prevents cancelling a non-existent order", async function () {
    const { order, ngo } = await deployOrder();

    await expect(
      order.connect(ngo).cancelOrder(999)
    ).to.be.revertedWith("order does not exist");
  });

  it("reverts registerNGO with a zero address", async function () {
    const { order } = await deployOrder();

    await expect(
      order.registerNGO(ethers.ZeroAddress)
    ).to.be.revertedWith("invalid NGO address");
  });

  it("allows admin to revoke the NGO role", async function () {
    const { order, ngo } = await deployOrder();

    await order.registerNGO(ngo.address);
    await order.revokeNGO(ngo.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await expect(
      order.connect(ngo).placeOrder(
        100,
        false,
        locationHash
      )
    ).to.be.reverted;
  });

  it("prevents cancelling an order that is already cancelled", async function () {
    const { order, ngo } = await deployOrder();

    await order.registerNGO(ngo.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await order.connect(ngo).placeOrder(
      100,
      false,
      locationHash
    );

    await order.connect(ngo).cancelOrder(1);

    await expect(
      order.connect(ngo).cancelOrder(1)
    ).to.be.revertedWith("order is not open");
  });

  it("reverts registerNGO when called by a non-admin", async function () {
    const { order, ngo, other } = await deployOrder();

    await expect(
      order.connect(other).registerNGO(ngo.address)
    ).to.be.reverted;
  });

  it("reverts revokeNGO when called by a non-admin", async function () {
    const { order, ngo, other } = await deployOrder();

    await order.registerNGO(ngo.address);

    await expect(
      order.connect(other).revokeNGO(ngo.address)
    ).to.be.reverted;
  });
  it("allows the matching engine to mark an open order as Matched", async function () {
    const { order, ngo, other } = await deployOrder();

    await order.registerNGO(ngo.address);

    const MATCHING_ENGINE_ROLE = await order.MATCHING_ENGINE_ROLE();
    await order.grantRole(MATCHING_ENGINE_ROLE, other.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await order.connect(ngo).placeOrder(
      100,
      false,
      locationHash
    );

    await order.connect(other).updateStatus(1, 1);

    const savedOrder = await order.getOrder(1);
    expect(savedOrder.status).to.equal(1);
  });

  it("rejects updateStatus for a non-existent order", async function () {
    const { order, other } = await deployOrder();

    const MATCHING_ENGINE_ROLE = await order.MATCHING_ENGINE_ROLE();
    await order.grantRole(MATCHING_ENGINE_ROLE, other.address);

    await expect(
      order.connect(other).updateStatus(999, 1)
    ).to.be.revertedWith("order does not exist");
  });

  it("rejects an invalid status update", async function () {
    const { order, ngo, other } = await deployOrder();

    await order.registerNGO(ngo.address);

    const MATCHING_ENGINE_ROLE = await order.MATCHING_ENGINE_ROLE();
    await order.grantRole(MATCHING_ENGINE_ROLE, other.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await order.connect(ngo).placeOrder(
      100,
      false,
      locationHash
    );

    await expect(
      order.connect(other).updateStatus(1, 2)
    ).to.be.revertedWith("invalid status update");
  });

  it("rejects matching an order that is not open", async function () {
    const { order, ngo, other } = await deployOrder();

    await order.registerNGO(ngo.address);

    const MATCHING_ENGINE_ROLE = await order.MATCHING_ENGINE_ROLE();
    await order.grantRole(MATCHING_ENGINE_ROLE, other.address);

    const locationHash = ethers.keccak256(
      ethers.toUtf8Bytes("test-location")
    );

    await order.connect(ngo).placeOrder(
      100,
      false,
      locationHash
    );

    await order.connect(ngo).cancelOrder(1);

    await expect(
      order.connect(other).updateStatus(1, 1)
    ).to.be.revertedWith("order is not open");
  });
  it("rejects setting a zero matching engine address", async function () {
    const { order } = await deployOrder();

    await expect(
      order.setMatchingEngine(ethers.ZeroAddress)
    ).to.be.revertedWith("invalid matching engine address");
  });

  it("allows admin to set the matching engine", async function () {
    const { order, other } = await deployOrder();

    const MATCHING_ENGINE_ROLE = await order.MATCHING_ENGINE_ROLE();

    await order.setMatchingEngine(other.address);

    expect(
      await order.hasRole(MATCHING_ENGINE_ROLE, other.address)
    ).to.equal(true);
  });

  it("allows admin to revoke the matching engine role", async function () {
    const { order, other } = await deployOrder();

    const MATCHING_ENGINE_ROLE = await order.MATCHING_ENGINE_ROLE();

    await order.setMatchingEngine(other.address);

    expect(
      await order.hasRole(MATCHING_ENGINE_ROLE, other.address)
    ).to.equal(true);

    await order.revokeMatchingEngine(other.address);

    expect(
      await order.hasRole(MATCHING_ENGINE_ROLE, other.address)
    ).to.equal(false);
  });
});
