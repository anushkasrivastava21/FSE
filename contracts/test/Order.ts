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
    expect(await order.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
  });

  it("allows admin to register an NGO", async function () {
    const { order, ngo } = await deployOrder();
    await order.registerNGO(ngo.address);
    const NGO_ROLE = await order.NGO_ROLE();
    expect(await order.hasRole(NGO_ROLE, ngo.address)).to.equal(true);
  });

  it("allows a registered NGO to place an order", async function () {
    const { order, ngo } = await deployOrder();
    await order.registerNGO(ngo.address);

    const quantity = 100;
    const urgencyFlag = true;
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("test-location"));

    await expect(
      order.connect(ngo).placeOrder(quantity, urgencyFlag, locationHash)
    )
      .to.emit(order, "OrderCreated")
      .withArgs(1, ngo.address, quantity);

    const savedOrder = await order.orders(1);
    expect(savedOrder.ngoAddress).to.equal(ngo.address);
    expect(savedOrder.quantity).to.equal(quantity);
    expect(savedOrder.urgencyFlag).to.equal(urgencyFlag);
    expect(savedOrder.locationHash).to.equal(locationHash);
    expect(savedOrder.status).to.equal(0);
  });

  it("rejects an order from an address without NGO role", async function () {
    const { order, other } = await deployOrder();
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("test-location"));

    await expect(
      order.connect(other).placeOrder(100, false, locationHash)
    ).to.be.reverted;
  });

  it("rejects an order with zero quantity", async function () {
    const { order, ngo } = await deployOrder();
    await order.registerNGO(ngo.address);
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("test-location"));

    await expect(
      order.connect(ngo).placeOrder(0, false, locationHash)
    ).to.be.revertedWith("quantity must be greater than zero");
  });

  it("allows the NGO to cancel its own open order", async function () {
    const { order, ngo } = await deployOrder();
    await order.registerNGO(ngo.address);
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("test-location"));

    await order.connect(ngo).placeOrder(100, false, locationHash);

    await expect(order.connect(ngo).cancelOrder(1))
      .to.emit(order, "OrderCancelled")
      .withArgs(1);

    const savedOrder = await order.orders(1);
    expect(savedOrder.status).to.equal(4);
  });

  it("prevents another address from cancelling the order", async function () {
    const { order, ngo, other } = await deployOrder();
    await order.registerNGO(ngo.address);
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("test-location"));

    await order.connect(ngo).placeOrder(100, false, locationHash);

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

    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("test-location"));

    await expect(
      order.connect(ngo).placeOrder(100, false, locationHash)
    ).to.be.reverted;
  });

  it("prevents cancelling an order that is already cancelled", async function () {
    const { order, ngo } = await deployOrder();
    await order.registerNGO(ngo.address);
    const locationHash = ethers.keccak256(ethers.toUtf8Bytes("test-location"));

    await order.connect(ngo).placeOrder(100, false, locationHash);
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
});