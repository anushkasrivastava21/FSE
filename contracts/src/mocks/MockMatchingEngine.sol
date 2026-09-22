// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IMatchingEngine.sol";

contract MockMatchingEngine is IMatchingEngine {
    mapping(bytes32 => bool) public matchExists;
    mapping(bytes32 => MatchRecord) private _matches;

    function setMatch(
        bytes32 matchId,
        uint256 listingId,
        uint256 orderId,
        uint256 urgencyScoreAtMatch
    ) external {
        matchExists[matchId] = true;
        _matches[matchId] = MatchRecord({
            listingId: listingId,
            orderId: orderId,
            urgencyScoreAtMatch: urgencyScoreAtMatch,
            timestamp: block.timestamp
        });
    }

    function matches(bytes32 matchId) external view returns (MatchRecord memory) {
        return _matches[matchId];
    }

    function computeUrgency(uint256) external pure returns (uint256) {
        return 0;
    }
}