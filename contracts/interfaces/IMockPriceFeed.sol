// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title IMockPriceFeed
 * @dev Interface for the mock price feed that extends AggregatorV3Interface
 */
interface IMockPriceFeed is AggregatorV3Interface {
    /**
     * @dev Set the token for the current query context
     * @param token Token address to query price for
     */
    function setQueryToken(address token) external;
    
    /**
     * @dev Set the latest answer for a specific token
     * @param token Token address
     * @param price Price to set
     */
    function setLatestAnswerForToken(address token, int256 price) external;
    
    /**
     * @dev Get the token price for a specific token
     * @param token Token address
     * @return price The price for the token
     */
    function getTokenPrice(address token) external view returns (int256);
    
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
    );
} 