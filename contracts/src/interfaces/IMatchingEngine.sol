// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMatchingEngine
/// @notice Interface published by Person A (Gate 0) so Person B can write Settlement.sol
///         without waiting for the full MatchingEngine implementation.
/// @dev Full implementation in MatchingEngine.sol — available at Gate 1 (Week 4).
interface IMatchingEngine {

    /// @notice Stores the result of a successful match for downstream contracts to read.
    struct MatchRecord {
        uint256 listingId;            // which Listing was matched
        uint256 orderId;              // which NGO Order was matched
        uint256 urgencyScoreAtMatch;  // urgency value at time of match (audit / dashboard)
        uint256 timestamp;            // block.timestamp of match execution
    }

    /// @notice Returns true if a matchId was legitimately produced by this engine.
    /// @dev Use this in Settlement.sol to guard recordHandoff():
    ///      require(IMatchingEngine(addr).matchExists(matchId), "bad matchId");
    /// @param matchId The bytes32 hash to check.
    function matchExists(bytes32 matchId) external view returns (bool);

    /// @notice Returns the full match record for a given matchId.
    /// @dev Settlement uses matches(matchId).listingId to trace back to donor address
    ///      for FoodCreditToken mint metadata.
    /// @param matchId The bytes32 hash of the match.
    function matches(bytes32 matchId) external view returns (MatchRecord memory);

    /// @notice Compute the current urgency score for an open listing.
    /// @dev Deterministic and publicly callable — any party can verify why a match happened.
    ///      urgency(t) = base_priority(quality, quantity) x decay(expiry - t)
    /// @param listingId On-chain listing ID.
    function computeUrgency(uint256 listingId) external view returns (uint256);
}
