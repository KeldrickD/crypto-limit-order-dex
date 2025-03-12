import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, BaseContract } from "ethers";
import { parseEther, parseUnits } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LimitOrderDEX", function () {
  let limitOrderDEX: any;
  let mockPriceFeed: any;
  let mockRouter: any;
  let mockTokenA: any;
  let mockTokenB: any;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let keeper: HardhatEthersSigner;

  const PRICE_FEED_DECIMALS = 8;
  const ONE_ETH = parseEther("1.0");
  const INITIAL_TOKEN_SUPPLY = parseEther("1000.0");
  const ROUTER_TOKEN_SUPPLY = parseEther("10000.0"); // Much larger supply for the router

  beforeEach(async function () {
    // Get signers
    [owner, user, keeper] = await ethers.getSigners();

    // Deploy mock price feed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.waitForDeployment();

    // Deploy mock swap router
    const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
    mockRouter = await MockSwapRouter.deploy();
    await mockRouter.waitForDeployment();

    // Deploy mock ERC20 tokens
    const MockToken = await ethers.getContractFactory("MockToken");
    mockTokenA = await MockToken.deploy("TokenA", "TOKENA");
    await mockTokenA.waitForDeployment();

    mockTokenB = await MockToken.deploy("TokenB", "TOKENB");
    await mockTokenB.waitForDeployment();

    // Mint tokens to user
    await mockTokenA.mint(user.address, INITIAL_TOKEN_SUPPLY);
    await mockTokenB.mint(user.address, INITIAL_TOKEN_SUPPLY);
    
    // Mint more tokens to router to handle swaps
    await mockTokenB.mint(await mockRouter.getAddress(), ROUTER_TOKEN_SUPPLY);

    // Set up mock price feeds
    await mockPriceFeed.setLatestAnswerForToken(await mockTokenA.getAddress(), parseUnits("2000", PRICE_FEED_DECIMALS)); // TokenA price
    await mockPriceFeed.setLatestAnswerForToken(await mockTokenB.getAddress(), parseUnits("1", PRICE_FEED_DECIMALS)); // TokenB price

    // Deploy LimitOrderDEX
    const LimitOrderDEX = await ethers.getContractFactory("LimitOrderDEX");
    limitOrderDEX = await LimitOrderDEX.deploy(await mockRouter.getAddress());
    await limitOrderDEX.waitForDeployment();

    // Set price feeds
    await limitOrderDEX.setPriceFeed(await mockTokenA.getAddress(), await mockPriceFeed.getAddress());
    await limitOrderDEX.setPriceFeed(await mockTokenB.getAddress(), await mockPriceFeed.getAddress());

    // Approve tokens for DEX
    await mockTokenA.connect(user).approve(await limitOrderDEX.getAddress(), ethers.MaxUint256);
    await mockTokenB.connect(user).approve(await limitOrderDEX.getAddress(), ethers.MaxUint256);
  });

  describe("Order Creation and Management", function () {
    it("Should create a new limit order", async function () {
      const amountIn = parseEther("1.0");
      const amountOutMin = parseEther("1900.0"); // Expecting at least 1900 TokenB for 1 TokenA
      const targetPrice = parseEther("1950.0"); // Execute when price reaches 1950 TokenB per TokenA

      // Create order
      await expect(
        limitOrderDEX.connect(user).createOrder(
          await mockTokenA.getAddress(), // tokenIn
          await mockTokenB.getAddress(), // tokenOut
          amountIn,
          amountOutMin,
          targetPrice
        )
      )
        .to.emit(limitOrderDEX, "OrderCreated")
        .withArgs(1, user.address, await mockTokenA.getAddress(), await mockTokenB.getAddress(), amountIn, targetPrice);

      // Check order details
      const order = await limitOrderDEX.orders(1);
      expect(order[0]).to.equal(user.address);
      expect(order[1]).to.equal(await mockTokenA.getAddress());
      expect(order[2]).to.equal(await mockTokenB.getAddress());
      expect(order[3]).to.equal(amountIn);
      expect(order[4]).to.equal(amountOutMin);
      expect(order[5]).to.equal(targetPrice);
      expect(order[7]).to.equal(0); // PENDING
    });

    it("Should cancel an existing order", async function () {
      // Create order
      await limitOrderDEX.connect(user).createOrder(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        ONE_ETH,
        parseEther("1900.0"),
        parseEther("1950.0")
      );

      // Check balance before cancellation
      const balanceBefore = await mockTokenA.balanceOf(user.address);

      // Cancel order
      await expect(limitOrderDEX.connect(user).cancelOrder(1))
        .to.emit(limitOrderDEX, "OrderCancelled")
        .withArgs(1);

      // Check order status
      const order = await limitOrderDEX.orders(1);
      expect(order[7]).to.equal(2); // CANCELLED

      // Check tokens returned
      const balanceAfter = await mockTokenA.balanceOf(user.address);
      expect(balanceAfter - balanceBefore).to.equal(ONE_ETH);
    });

    it("Should not allow cancelling another user's order", async function () {
      // Create order from user
      await limitOrderDEX.connect(user).createOrder(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        ONE_ETH,
        parseEther("1900.0"),
        parseEther("1950.0")
      );

      // Try to cancel from owner (not the creator)
      await expect(limitOrderDEX.connect(owner).cancelOrder(1)).to.be.revertedWith("Not order owner");
    });
  });

  describe("Order Execution", function () {
    it("Should execute an order when price conditions are met", async function () {
      // Create order with target price of 1950 TokenB per TokenA
      await limitOrderDEX.connect(user).createOrder(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        ONE_ETH,
        parseEther("1900.0"),
        parseEther("1950.0")
      );

      // Mock a price change to make the order executable
      // Set price of TokenB to make the relative price condition pass
      await mockPriceFeed.setLatestAnswerForToken(
        await mockTokenB.getAddress(),
        parseUnits("2000", PRICE_FEED_DECIMALS)
      );
      
      // Set TokenA price
      await mockPriceFeed.setLatestAnswerForToken(
        await mockTokenA.getAddress(),
        parseUnits("1", PRICE_FEED_DECIMALS)
      );

      // Execute order
      await expect(limitOrderDEX.connect(keeper).executeOrder(1))
        .to.emit(limitOrderDEX, "OrderExecuted")
        .withArgs(1, ONE_ETH, parseEther("1900.0"));

      // Check order status
      const order = await limitOrderDEX.orders(1);
      expect(order[7]).to.equal(1); // EXECUTED
    });

    it("Should not execute an order when price conditions are not met", async function () {
      // Create order with target price of 1950 TokenB per TokenA
      await limitOrderDEX.connect(user).createOrder(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        ONE_ETH,
        parseEther("1900.0"),
        parseEther("1950.0")
      );

      // Set price of TokenB to be lower than the target
      await mockPriceFeed.setLatestAnswerForToken(
        await mockTokenB.getAddress(),
        parseUnits("1900", PRICE_FEED_DECIMALS)
      );
      
      // Set TokenA price
      await mockPriceFeed.setLatestAnswerForToken(
        await mockTokenA.getAddress(),
        parseUnits("1", PRICE_FEED_DECIMALS)
      );

      // Try to execute order
      await expect(limitOrderDEX.connect(keeper).executeOrder(1)).to.be.revertedWith("Price condition not met");
    });

    it("Should not execute an already executed order", async function () {
      // Create order
      await limitOrderDEX.connect(user).createOrder(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        ONE_ETH,
        parseEther("1900.0"),
        parseEther("1950.0")
      );

      // Make price condition pass
      await mockPriceFeed.setLatestAnswerForToken(
        await mockTokenB.getAddress(),
        parseUnits("2000", PRICE_FEED_DECIMALS)
      );
      
      // Set TokenA price
      await mockPriceFeed.setLatestAnswerForToken(
        await mockTokenA.getAddress(),
        parseUnits("1", PRICE_FEED_DECIMALS)
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
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        ONE_ETH,
        parseEther("1900.0"),
        parseEther("1950.0")
      );

      await limitOrderDEX.connect(user).createOrder(
        await mockTokenB.getAddress(),
        await mockTokenA.getAddress(),
        ONE_ETH,
        parseEther("0.0004"),
        parseEther("0.0005")
      );

      // Create an order from a different user (owner)
      await mockTokenA.mint(owner.address, INITIAL_TOKEN_SUPPLY);
      await mockTokenA.connect(owner).approve(await limitOrderDEX.getAddress(), ethers.MaxUint256);
      await limitOrderDEX.connect(owner).createOrder(
        await mockTokenA.getAddress(),
        await mockTokenB.getAddress(),
        ONE_ETH,
        parseEther("1900.0"),
        parseEther("1950.0")
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