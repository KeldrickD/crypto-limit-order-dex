// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../interfaces/IMockPriceFeed.sol";

/**
 * @title MockPriceFeed
 * @dev Mock Chainlink price feed for testing
 */
contract MockPriceFeed is IMockPriceFeed {
    int256 private _latestAnswer;
    uint8 private _decimals = 8;
    string private _description = "Mock Price Feed";
    uint256 private _version = 1;
    mapping(address => int256) private _tokenPrices;
    
    // Track which token this price feed is for in the current context
    address private _currentQueryToken;

    /**
     * @dev Set the latest answer (price)
     * @param answer The price to set
     */
    function setLatestAnswer(int256 answer) external {
        _latestAnswer = answer;
    }
    
    /**
     * @dev Set the latest answer for a specific token
     * @param token Token address
     * @param price Price to set
     */
    function setLatestAnswerForToken(address token, int256 price) external {
        _tokenPrices[token] = price;
    }

    /**
     * @dev Set the token for the current query context
     * @param token Token address to query price for
     */
    function setQueryToken(address token) external {
        _currentQueryToken = token;
    }
    
    /**
     * @dev Get the token price for a specific token
     * @param token Token address
     * @return price The price for the token
     */
    function getTokenPrice(address token) external view returns (int256) {
        return _tokenPrices[token];
    }
    
    /**
     * @dev Get the latest round data for a specific token
     * @param token Token address
     * @return roundId The round ID
     * @return answer The price
     * @return startedAt When the round started
     * @return updatedAt When the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function latestRoundDataForToken(address token) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        int256 price = _tokenPrices[token];
        
        return (
            1,              // roundId
            price,          // answer
            block.timestamp - 1 hours,  // startedAt
            block.timestamp,           // updatedAt
            1               // answeredInRound
        );
    }

    /**
     * @dev Get the latest round data
     * @return roundId The round ID
     * @return answer The price
     * @return startedAt When the round started
     * @return updatedAt When the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function latestRoundData() external override view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        // Use the token price if we have it, otherwise use the default
        int256 price;
        if (_currentQueryToken != address(0) && _tokenPrices[_currentQueryToken] != 0) {
            price = _tokenPrices[_currentQueryToken];
        } else {
            price = _latestAnswer;
        }
        
        return (
            1,              // roundId
            price,          // answer
            block.timestamp - 1 hours,  // startedAt
            block.timestamp,           // updatedAt
            1               // answeredInRound
        );
    }

    /**
     * @dev Get the decimals of the price feed
     * @return decimals The number of decimals
     */
    function decimals() external override view returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Get the description of the price feed
     * @return description The description
     */
    function description() external override view returns (string memory) {
        return _description;
    }

    /**
     * @dev Get the version of the price feed
     * @return version The version
     */
    function version() external override view returns (uint256) {
        return _version;
    }

    /**
     * @dev Get historical round data
     * @param _roundId The round ID
     * @return roundId The round ID
     * @return answer The price
     * @return startedAt When the round started
     * @return updatedAt When the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function getRoundData(uint80 _roundId) external override view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        // Use the token price if we have it, otherwise use the default
        int256 price;
        if (_currentQueryToken != address(0) && _tokenPrices[_currentQueryToken] != 0) {
            price = _tokenPrices[_currentQueryToken];
        } else {
            price = _latestAnswer;
        }
        
        return (
            _roundId,       // roundId
            price,          // answer
            block.timestamp - 1 hours,  // startedAt
            block.timestamp,           // updatedAt
            _roundId        // answeredInRound
        );
    }
} 