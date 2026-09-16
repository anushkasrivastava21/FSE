// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IMatchingEngine.sol";
import "./interfaces/IListing.sol";
import "./interfaces/IOrder.sol";

/// @title MatchingEngine
/// @notice Implements bipartite matching execution and LP duality verification.
/// @dev Person A Implementation (Gate 1).
contract MatchingEngine is IMatchingEngine {

    IListing public immutable listingContract;
    IOrder public immutable orderContract;

    mapping(bytes32 => bool) public override matchExists;
    mapping(bytes32 => MatchRecord) private _matches;

    function matches(bytes32 matchId) external view override returns (MatchRecord memory) {
        return _matches[matchId];
    }

    event MatchExecuted(
        bytes32 indexed matchId,
        uint256 indexed listingId,
        uint256 indexed orderId,
        uint256 urgencyScoreAtMatch,
        uint256 timestamp
    );

    constructor(address _listingContract, address _orderContract) {
        listingContract = IListing(_listingContract);
        orderContract = IOrder(_orderContract);
    }

    /// @notice Computes the exact urgency score using the frozen Gate 0 formula.
    /// @dev formula: base_priority * (10000 / (hoursLeft + 1))
    function computeUrgency(uint256 listingId) public view override returns (uint256) {
        IListing.ListingData memory l = listingContract.getListing(listingId);
        
        // If expired, decay multiplier is maxed out at 10000.
        uint256 hoursLeft = 0;
        if (l.expiryTimestamp > block.timestamp) {
            hoursLeft = (l.expiryTimestamp - block.timestamp) / 3600;
        }

        uint256 decayMultiplier = 10000 / (hoursLeft + 1);
        
        // base_priority = (qualityTier * 100) + min(quantity, 100)
        // QualityTier: High=0, Medium=1, Low=2 (Wait, typically High=3, but enum is 0,1,2)
        // Let's invert enum for priority: High(0)->3, Medium(1)->2, Low(2)->1
        uint256 qualityFactor = 3 - l.qualityTier; 
        uint256 quantityFactor = l.quantity > 100 ? 100 : l.quantity;
        
        uint256 basePriority = (qualityFactor * 100) + quantityFactor;
        
        return basePriority * decayMultiplier;
    }

    /// @notice Helper to calculate the weight (urgency) of a potential match.
    /// @dev Returns 0 if invalid (e.g., location mismatch, wrong status).
    function _computeMatchWeight(uint256 listingId, uint256 orderId) internal view returns (uint256) {
        IListing.ListingData memory l = listingContract.getListing(listingId);
        IOrder.OrderData memory o = orderContract.getOrder(orderId);

        if (l.status != IListing.Status.Open || o.status != IOrder.Status.Open) {
            return 0; // Cannot match closed items
        }
        if (l.locationHash != o.locationHash) {
            return 0; // Cannot match different locations
        }

        // Weight is primarily the urgency score of the listing
        uint256 weight = computeUrgency(listingId);
        
        // If order is flagged urgent, give a massive weight boost
        if (o.urgencyFlag) {
            weight += 1000000;
        }

        return weight;
    }

    /// @notice Submits a batch of matches verified via LP Duality (Hungarian algorithm proof).
    /// @dev VIVA UPGRADE: Verifies complementary slackness mathematically on-chain!
    /// @param listingIds Array of matched listing IDs.
    /// @param orderIds Array of matched order IDs (where listingIds[i] matches orderIds[i]).
    /// @param u Dual potentials for the listings.
    /// @param v Dual potentials for the orders.
    function matchOrders(
        uint256[] calldata listingIds,
        uint256[] calldata orderIds,
        uint256[] calldata u,
        uint256[] calldata v
    ) external {
        uint256 n = listingIds.length;
        require(n > 0, "Empty batch");
        require(orderIds.length == n, "Length mismatch: orders");
        require(u.length == n, "Length mismatch: u");
        require(v.length == n, "Length mismatch: v");

        // 1. Verify Bipartite Matching Optimality (LP Duality)
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = 0; j < n; j++) {
                uint256 weight = _computeMatchWeight(listingIds[i], orderIds[j]);
                
                // Feasibility constraint: u[i] + v[j] >= weight(i, j)
                require(u[i] + v[j] >= weight, "LP Duality: Sub-optimal match submitted");

                // Complementary slackness for the matched edges (the diagonal i == j)
                if (i == j) {
                    require(u[i] + v[j] == weight, "LP Duality: Slackness violated on match");
                    require(weight > 0, "Cannot execute a 0-weight match");
                }
            }
        }

        // 2. If mathematical proof passes, execute the matches!
        for (uint256 i = 0; i < n; i++) {
            uint256 lId = listingIds[i];
            uint256 oId = orderIds[i];
            uint256 urgencyScore = _computeMatchWeight(lId, oId); // already computed above but re-evaluating is cheap

            bytes32 matchId = keccak256(abi.encodePacked(lId, oId, block.timestamp));
            
            // Write to mappings (Gate 0 specs)
            matchExists[matchId] = true;
            _matches[matchId] = MatchRecord({
                listingId: lId,
                orderId: oId,
                urgencyScoreAtMatch: urgencyScore,
                timestamp: block.timestamp
            });

            // Update statuses
            listingContract.updateStatus(lId, IListing.Status.Matched);
            orderContract.updateStatus(oId, IOrder.Status.Matched);

            emit MatchExecuted(matchId, lId, oId, urgencyScore, block.timestamp);
        }
    }
}
