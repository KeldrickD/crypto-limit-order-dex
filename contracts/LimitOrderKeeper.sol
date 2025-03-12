// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
import "./LimitOrderDEX.sol";

/**
 * @title LimitOrderKeeper
 * @dev Chainlink Keeper to automatically execute limit orders when conditions are met
 */
contract LimitOrderKeeper is AutomationCompatibleInterface {
    LimitOrderDEX public dex;
    uint256 public immutable checkGasLimit;
    uint256 public lastOrderIdChecked;
    uint256 public maxOrdersToCheck;
    
    constructor(address _dex, uint256 _checkGasLimit, uint256 _maxOrdersToCheck) {
        dex = LimitOrderDEX(_dex);
        checkGasLimit = _checkGasLimit;
        maxOrdersToCheck = _maxOrdersToCheck;
    }
    
    /**
     * @dev Check if upkeep is needed (required by Chainlink Keeper)
     * @param checkData Additional data for the check
     * @return upkeepNeeded Whether upkeep is needed
     * @return performData Data for the performUpkeep function
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 nextOrderId = dex.nextOrderId();
        if (lastOrderIdChecked >= nextOrderId) {
            return (false, "");
        }
        
        uint256 startOrderId = lastOrderIdChecked + 1;
        uint256 endOrderId = startOrderId + maxOrdersToCheck - 1;
        if (endOrderId > nextOrderId - 1) {
            endOrderId = nextOrderId - 1;
        }
        
        uint256[] memory executableOrderIds = new uint256[](endOrderId - startOrderId + 1);
        uint256 count = 0;
        
        // Check which orders can be executed
        for (uint256 i = startOrderId; i <= endOrderId; i++) {
            (bool isExecutable, ) = canExecuteOrder(i);
            if (isExecutable) {
                executableOrderIds[count++] = i;
            }
        }
        
        if (count > 0) {
            // Resize array to actual number of executable orders
            uint256[] memory resizedOrderIds = new uint256[](count);
            for (uint256 i = 0; i < count; i++) {
                resizedOrderIds[i] = executableOrderIds[i];
            }
            
            upkeepNeeded = true;
            performData = abi.encode(endOrderId, resizedOrderIds);
        } else {
            upkeepNeeded = false;
            performData = abi.encode(endOrderId, new uint256[](0));
        }
    }
    
    /**
     * @dev Perform upkeep (execute orders)
     * @param performData Data from checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external override {
        (uint256 endOrderId, uint256[] memory orderIds) = abi.decode(performData, (uint256, uint256[]));
        
        lastOrderIdChecked = endOrderId;
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            try dex.executeOrder(orderIds[i]) {
                // Order executed successfully
            } catch {
                // Order execution failed, continue with next order
            }
        }
    }
    
    /**
     * @dev Check if an order can be executed
     * @param orderId ID of the order to check
     * @return isExecutable Whether the order can be executed
     * @return reason Reason for failure if not executable
     */
    function canExecuteOrder(uint256 orderId) public view returns (bool isExecutable, string memory reason) {
        LimitOrderDEX.Order memory order = dex.orders(orderId);
        
        // Check if order is pending
        if (order.status != LimitOrderDEX.OrderStatus.PENDING) {
            return (false, "Order not pending");
        }
        
        // Check if price condition is met
        bool priceConditionMet = dex.checkPriceCondition(
            order.tokenIn,
            order.tokenOut,
            order.targetPrice
        );
        
        if (!priceConditionMet) {
            return (false, "Price condition not met");
        }
        
        return (true, "");
    }
    
    /**
     * @dev Update max orders to check
     * @param _maxOrdersToCheck New max orders to check
     */
    function setMaxOrdersToCheck(uint256 _maxOrdersToCheck) external {
        require(msg.sender == address(dex.owner()), "Not authorized");
        maxOrdersToCheck = _maxOrdersToCheck;
    }
} 