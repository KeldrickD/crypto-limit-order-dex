import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LimitOrderDEX", function () {
  let limitOrderDEX: Contract;
  let mockPriceFeed: Contract;
  let mockRouter: Contract;
  let mockTokenA: Contract;
  let mockTokenB: Contract;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let keeper: SignerWithAddress;

  const PRICE_FEED_DECIMALS = 8;
  const ONE_ETH = ethers.utils.parseEther("1.0");
  const INITIAL_TOKEN_SUPPLY = ethers.utils.parseEther("1000.0");

  beforeEach(async function () {
    // Get signers
    [owner, user, keeper] = await ethers.getSigners();

    // Deploy mock price feed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.deployed();

    // Deploy mock swap router
    const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
    mockRouter = await MockSwapRouter.deploy();
    await mockRouter.deployed();

    // Deploy mock ERC20 tokens
    const MockToken = await ethers.getContractFactory("MockToken");
    mockTokenA = await MockToken.deploy("TokenA", "TOKENA");
    await mockTokenA.deployed();

    mockTokenB = await MockToken.deploy("TokenB", "TOKENB");
    await mockTokenB.deployed();

    // Mint tokens to user
    await mockTokenA.mint(user.address, INITIAL_TOKEN_SUPPLY);
    await mockTokenB.mint(user.address, INITIAL_TOKEN_SUPPLY);
    await mockTokenB.mint(mockRouter.address, INITIAL_TOKEN_SUPPLY);

    // Set up mock price feeds
    await mockPriceFeed.setLatestAnswer(ethers.utils.parseUnits("2000", PRICE_FEED_DECIMALS)); // TokenA price
    await mockPriceFeed.setLatestAnswer(ethers.utils.parseUnits("1", PRICE_FEED_DECIMALS)); // TokenB price

    // Deploy LimitOrderDEX
    const LimitOrderDEX = await ethers.getContractFactory("LimitOrderDEX");
    limitOrderDEX = await LimitOrderDEX.deploy(mockRouter.address);
    await limitOrderDEX.deployed();

    // Set price feeds
    await limitOrderDEX.setPriceFeed(mockTokenA.address, mockPriceFeed.address);
    await limitOrderDEX.setPriceFeed(mockTokenB.address, mockPriceFeed.address);

    // Approve tokens for DEX
    await mockTokenA.connect(user).approve(limitOrderDEX.address, ethers.constants.MaxUint256);
    await mockTokenB.connect(user).approve(limitOrderDEX.address, ethers.constants.MaxUint256);
  });

  describe("Order Creation and Management", function () {
    it("Should create a new limit order", async function () {
      const amountIn = ethers.utils.parseEther("1.0");
      const amountOutMin = ethers.utils.parseEther("1900.0"); // Expecting at least 1900 TokenB for 1 TokenA
      const targetPrice = ethers.utils.parseEther("1950.0"); // Execute when price reaches 1950 TokenB per TokenA

      // Create order
      await expect(
        limitOrderDEX.connect(user).createOrder(
          mockTokenA.address, // tokenIn
          mockTokenB.address, // tokenOut
          amountIn,
          amountOutMin,
          targetPrice
        )
      )
        .to.emit(limitOrderDEX, "OrderCreated")
        .withArgs(1, user.address, mockTokenA.address, mockTokenB.address, amountIn, targetPrice);

      // Check order details
      const order = await limitOrderDEX.orders(1);
      expect(order.owner).to.equal(user.address);
      expect(order.tokenIn).to.equal(mockTokenA.address);
      expect(order.tokenOut).to.equal(mockTokenB.address);
      expect(order.amountIn).to.equal(amountIn);
      expect(order.amountOutMin).to.equal(amountOutMin);
      expect(order.targetPrice).to.equal(targetPrice);
      expect(order.status).to.equal(0); // PENDING
    });

    it("Should cancel an existing order", async function () {
      // Create order
      await limitOrderDEX.connect(user).createOrder(
        mockTokenA.address,
        mockTokenB.address,
        ONE_ETH,
        ethers.utils.parseEther("1900.0"),
        ethers.utils.parseEther("1950.0")
      );

      // Check balance before cancellation
      const balanceBefore = await mockTokenA.balanceOf(user.address);

      // Cancel order
      await expect(limitOrderDEX.connect(user).cancelOrder(1))
        .to.emit(limitOrderDEX, "OrderCancelled")
        .withArgs(1);

      // Check order status
      const order = await limitOrderDEX.orders(1);
      expect(order.status).to.equal(2); // CANCELLED

      // Check tokens returned
      const balanceAfter = await mockTokenA.balanceOf(user.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(ONE_ETH);
    });

    it("Should not allow cancelling another user's order", async function () {
      // Create order from user
      await limitOrderDEX.connect(user).createOrder(
        mockTokenA.address,
        mockTokenB.address,
        ONE_ETH,
        ethers.utils.parseEther("1900.0"),
        ethers.utils.parseEther("1950.0")
      );

      // Try to cancel from owner (not the creator)
      await expect(limitOrderDEX.connect(owner).cancelOrder(1)).to.be.revertedWith("Not order owner");
    });
  });

  describe("Order Execution", function () {
    it("Should execute an order when price conditions are met", async function () {
      // Create order with target price of 1950 TokenB per TokenA
      await limitOrderDEX.connect(user).createOrder(
        mockTokenA.address,
        mockTokenB.address,
        ONE_ETH,
        ethers.utils.parseEther("1900.0"),
        ethers.utils.parseEther("1950.0")
      );

      // Mock a price change to make the order executable
      // Set price of TokenB to make the relative price condition pass
      await mockPriceFeed.setLatestAnswerForToken(
        mockTokenB.address,
        ethers.utils.parseUnits("2000", PRICE_FEED_DECIMALS)
      );

      // Execute order
      await expect(limitOrderDEX.connect(keeper).executeOrder(1))
        .to.emit(limitOrderDEX, "OrderExecuted")
        .withArgs(1, ONE_ETH, ethers.utils.parseEther("2000.0"));

      // Check order status
      const order = await limitOrderDEX.orders(1);
      expect(order.status).to.equal(1); // EXECUTED
    });

    it("Should not execute an order when price conditions are not met", async function () {
      // Create order with target price of 1950 TokenB per TokenA
      await limitOrderDEX.connect(user).createOrder(
        mockTokenA.address,
        mockTokenB.address,
        ONE_ETH,
        ethers.utils.parseEther("1900.0"),
        ethers.utils.parseEther("1950.0")
      );

      // Set price of TokenB to be lower than the target
      await mockPriceFeed.setLatestAnswerForToken(
        mockTokenB.address,
        ethers.utils.parseUnits("1900", PRICE_FEED_DECIMALS)
      );

      // Try to execute order
      await expect(limitOrderDEX.connect(keeper).executeOrder(1)).to.be.revertedWith("Price condition not met");
    });

    it("Should not execute an already executed order", async function () {
      // Create order
      await limitOrderDEX.connect(user).createOrder(
        mockTokenA.address,
        mockTokenB.address,
        ONE_ETH,
        ethers.utils.parseEther("1900.0"),
        ethers.utils.parseEther("1950.0")
      );

      // Make price condition pass
      await mockPriceFeed.setLatestAnswerForToken(
        mockTokenB.address,
        ethers.utils.parseUnits("2000", PRICE_FEED_DECIMALS)
      );

      // Execute order
      await limitOrderDEX.connect(keeper).executeOrder(1);

      // Try to execute again
      await expect(limitOrderDEX.connect(keeper).executeOrder(1)).to.be.revertedWith("Order not pending");
    });
  });

  describe("User Order Management", function () {
    it("Should get all pending orders for a user", async function () {
      // Create multiple orders
      await limitOrderDEX.connect(user).createOrder(
        mockTokenA.address,
        mockTokenB.address,
        ONE_ETH,
        ethers.utils.parseEther("1900.0"),
        ethers.utils.parseEther("1950.0")
      );

      await limitOrderDEX.connect(user).createOrder(
        mockTokenB.address,
        mockTokenA.address,
        ONE_ETH,
        ethers.utils.parseEther("0.0004"),
        ethers.utils.parseEther("0.0005")
      );

      // Create an order from a different user (owner)
      await mockTokenA.mint(owner.address, INITIAL_TOKEN_SUPPLY);
      await mockTokenA.connect(owner).approve(limitOrderDEX.address, ethers.constants.MaxUint256);
      await limitOrderDEX.connect(owner).createOrder(
        mockTokenA.address,
        mockTokenB.address,
        ONE_ETH,
        ethers.utils.parseEther("1900.0"),
        ethers.utils.parseEther("1950.0")
      );

      // Get user's pending orders
      const pendingOrders = await limitOrderDEX.getPendingOrdersByUser(user.address);
      expect(pendingOrders.length).to.equal(2);
      expect(pendingOrders[0]).to.equal(1);
      expect(pendingOrders[1]).to.equal(2);

      // Cancel one order
      await limitOrderDEX.connect(user).cancelOrder(1);

      // Get pending orders again
      const updatedPendingOrders = await limitOrderDEX.getPendingOrdersByUser(user.address);
      expect(updatedPendingOrders.length).to.equal(1);
      expect(updatedPendingOrders[0]).to.equal(2);
    });
  });
}); 