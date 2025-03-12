// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/**
 * @title LimitOrderDEX
 * @dev A decentralized exchange for limit orders on Base L2
 */
contract LimitOrderDEX is Ownable {
    // Order status enum
    enum OrderStatus { PENDING, EXECUTED, CANCELLED }
    
    // Order struct
    struct Order {
        address owner;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 targetPrice; // Price at which to execute (in terms of tokenOut/tokenIn)
        uint256 timestamp;
        OrderStatus status;
    }
    
    // Order tracking
    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;
    
    // Price feed mapping (token address => price feed address)
    mapping(address => address) public priceFeeds;
    
    // Uniswap V3 router
    ISwapRouter public swapRouter;
    
    // Events
    event OrderCreated(uint256 indexed orderId, address indexed owner, address tokenIn, address tokenOut, uint256 amountIn, uint256 targetPrice);
    event OrderExecuted(uint256 indexed orderId, uint256 amountIn, uint256 amountOut);
    event OrderCancelled(uint256 indexed orderId);
    event PriceFeedUpdated(address indexed token, address priceFeed);
    
    /**
     * @dev Constructor
     * @param _swapRouter Uniswap V3 swap router address
     */
    constructor(address _swapRouter) Ownable(msg.sender) {
        swapRouter = ISwapRouter(_swapRouter);
        nextOrderId = 1;
    }
    
    /**
     * @dev Set price feed for a token
     * @param token Token address
     * @param priceFeed Chainlink price feed address
     */
    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = priceFeed;
        emit PriceFeedUpdated(token, priceFeed);
    }
    
    /**
     * @dev Create a new limit order
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum amount of output tokens to receive
     * @param targetPrice Target price for execution (in terms of tokenOut/tokenIn)
     * @return orderId The ID of the created order
     */
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 targetPrice
    ) external returns (uint256 orderId) {
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token addresses");
        require(amountIn > 0, "Amount must be greater than 0");
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");
        
        orderId = nextOrderId++;
        
        orders[orderId] = Order({
            owner: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOutMin: amountOutMin,
            targetPrice: targetPrice,
            timestamp: block.timestamp,
            status: OrderStatus.PENDING
        });
        
        emit OrderCreated(orderId, msg.sender, tokenIn, tokenOut, amountIn, targetPrice);
    }
    
    /**
     * @dev Cancel an existing order
     * @param orderId ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.owner == msg.sender, "Not order owner");
        require(order.status == OrderStatus.PENDING, "Order not pending");
        
        order.status = OrderStatus.CANCELLED;
        
        // Return tokens to owner
        IERC20(order.tokenIn).transfer(order.owner, order.amountIn);
        
        emit OrderCancelled(orderId);
    }
    
    /**
     * @dev Execute an order if price conditions are met
     * @param orderId ID of the order to execute
     */
    function executeOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "Order not pending");
        
        // Check if price conditions are met
        bool canExecute = checkPriceCondition(order.tokenIn, order.tokenOut, order.targetPrice);
        require(canExecute, "Price condition not met");
        
        // Mark as executed before external calls
        order.status = OrderStatus.EXECUTED;
        
        // Execute swap using Uniswap
        uint256 amountOut = executeSwap(
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.amountOutMin,
            order.owner
        );
        
        emit OrderExecuted(orderId, order.amountIn, amountOut);
    }
    
    /**
     * @dev Check if price condition is met for order execution
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param targetPrice Target price
     * @return canExecute Whether the order can be executed
     */
    function checkPriceCondition(
        address tokenIn,
        address tokenOut,
        uint256 targetPrice
    ) public view returns (bool canExecute) {
        // Get current price from Chainlink
        uint256 currentPrice = getCurrentPrice(tokenIn, tokenOut);
        
        // For a BUY order (swap token for asset), execute when price <= target price
        // For a SELL order (swap asset for token), execute when price >= target price
        // This is a simplified version, in a real implementation you'd need to handle the direction
        return currentPrice >= targetPrice;
    }
    
    /**
     * @dev Get current price from Chainlink
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return price Current price (tokenOut/tokenIn)
     */
    function getCurrentPrice(address tokenIn, address tokenOut) public view returns (uint256) {
        address inFeed = priceFeeds[tokenIn];
        address outFeed = priceFeeds[tokenOut];
        
        require(inFeed != address(0) && outFeed != address(0), "Price feed not set");
        
        // Get price from Chainlink
        (, int256 inPrice,,,) = AggregatorV3Interface(inFeed).latestRoundData();
        (, int256 outPrice,,,) = AggregatorV3Interface(outFeed).latestRoundData();
        
        require(inPrice > 0 && outPrice > 0, "Invalid price data");
        
        // Calculate relative price (tokenOut/tokenIn)
        // Note: This assumes both price feeds have the same decimals (usually 8)
        // In a real implementation, you should handle different decimals
        return (uint256(outPrice) * 1e18) / uint256(inPrice);
    }
    
    /**
     * @dev Execute swap using Uniswap V3
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum amount of output tokens
     * @param recipient Recipient of output tokens
     * @return amountOut Amount of output tokens received
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256 amountOut) {
        // Approve router to spend tokens
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Create swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 3000, // 0.3% fee tier
            recipient: recipient,
            deadline: block.timestamp + 15 minutes,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });
        
        // Execute swap
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }
    
    /**
     * @dev Get pending orders for a user
     * @param user Address of the user
     * @return orderIds Array of order IDs belonging to the user
     */
    function getPendingOrdersByUser(address user) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count pending orders
        for (uint256 i = 1; i < nextOrderId; i++) {
            if (orders[i].owner == user && orders[i].status == OrderStatus.PENDING) {
                count++;
            }
        }
        
        // Create array of order IDs
        uint256[] memory orderIds = new uint256[](count);
        uint256 index = 0;
        
        // Fill array with order IDs
        for (uint256 i = 1; i < nextOrderId; i++) {
            if (orders[i].owner == user && orders[i].status == OrderStatus.PENDING) {
                orderIds[index] = i;
                index++;
            }
        }
        
        return orderIds;
    }
} 