// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockPriceFeed
 * @dev Mock Chainlink price feed for testing
 */
contract MockPriceFeed is AggregatorV3Interface {
    int256 private _latestAnswer;
    uint8 private _decimals = 8;
    string private _description = "Mock Price Feed";
    uint256 private _version = 1;
    mapping(address => int256) private _tokenPrices;

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
        return (
            1,              // roundId
            _latestAnswer,  // answer
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
        return (
            _roundId,       // roundId
            _latestAnswer,  // answer
            block.timestamp - 1 hours,  // startedAt
            block.timestamp,           // updatedAt
            _roundId        // answeredInRound
        );
    }
} 