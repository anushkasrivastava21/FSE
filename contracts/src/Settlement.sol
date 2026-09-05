// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./interfaces/IMatchingEngine.sol";
import "./interfaces/IListing.sol";
import "./interfaces/IFoodCreditToken.sol";

contract Settlement is Ownable, ReentrancyGuard {
    enum Stage {
        PickedUp,
        InTransit,
        Delivered
    }

    struct Handoff {
        Stage stage;
        address actor;
        uint256 timestamp;
    }

    IMatchingEngine public immutable matchingEngine;
    IListing public immutable listing;
    IFoodCreditToken public immutable foodCreditToken;

    mapping(bytes32 => Handoff[]) private _handoffs;

    event HandoffRecorded(
        bytes32 indexed matchId,
        uint8 indexed stage,
        address indexed actor,
        uint256 timestamp
    );

    constructor(
        address initialOwner,
        address matchingEngineAddress,
        address listingAddress,
        address foodCreditTokenAddress
    ) Ownable(initialOwner) {
        require(
            matchingEngineAddress != address(0),
            "invalid matching engine"
        );
        require(
            listingAddress != address(0),
            "invalid listing"
        );
        require(
            foodCreditTokenAddress != address(0),
            "invalid food credit token"
        );

        matchingEngine = IMatchingEngine(matchingEngineAddress);
        listing = IListing(listingAddress);
        foodCreditToken = IFoodCreditToken(foodCreditTokenAddress);
    }

    function recordHandoff(
        bytes32 matchId,
        Stage stage,
        address actor
    ) external nonReentrant {
        require(
            matchingEngine.matchExists(matchId),
            "bad matchId"
        );

        require(
            actor != address(0),
            "invalid actor"
        );

        Handoff[] storage history = _handoffs[matchId];

        if (history.length == 0) {
            require(
                stage == Stage.PickedUp,
                "must start with pickup"
            );
        } else {
            Stage previousStage = history[history.length - 1].stage;

            require(
                uint8(stage) == uint8(previousStage) + 1,
                "invalid stage transition"
            );
        }

        uint256 timestamp = block.timestamp;

        history.push(
            Handoff({
                stage: stage,
                actor: actor,
                timestamp: timestamp
            })
        );

        emit HandoffRecorded(
            matchId,
            uint8(stage),
            actor,
            timestamp
        );

        if (stage == Stage.Delivered) {
            IMatchingEngine.MatchRecord memory matchRecord =
                matchingEngine.matches(matchId);

            IListing.ListingData memory listingData =
                listing.getListing(matchRecord.listingId);

            foodCreditToken.mint(
                listingData.donor,
                matchId,
                listingData.metadataURI
            );
        }
    }

    function getHandoffs(
        bytes32 matchId
    ) external view returns (Handoff[] memory) {
        return _handoffs[matchId];
    }
}
