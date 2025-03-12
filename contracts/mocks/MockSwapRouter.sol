// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

/**
 * @title MockSwapRouter
 * @dev Mock Uniswap V3 swap router for testing
 */
contract MockSwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    /**
     * @dev Execute a swap with exact input
     * @param params Swap parameters
     * @return amountOut Amount of output tokens received
     */
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut) {
        // Transfer input tokens from caller to this contract
        // Note: In a real scenario, the caller would have approved this contract
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        
        // Calculate amountOut (just return 2000 tokens per ETH for this mock)
        amountOut = params.amountIn * 2000;
        
        // Transfer output tokens to recipient
        IERC20(params.tokenOut).transfer(params.recipient, amountOut);
        
        return amountOut;
    }
} 