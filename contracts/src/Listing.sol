// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IListing.sol";

/// @title Listing
/// @notice Contract for donors to create and manage food surplus listings.
/// @dev Person A Implementation (Gate 1).
contract Listing is IListing {

    uint256 public nextListingId = 1;
    mapping(uint256 => ListingData) private _listings;

    address public matchingEngine;
    address public settlement;

    event ListingCreated(uint256 indexed listingId, address indexed donor, uint256 expiryTimestamp);
    event ListingCancelled(uint256 indexed listingId);
    event ListingStatusUpdated(uint256 indexed listingId, uint8 newStatus);

    modifier onlyMatchingEngineOrSettlement() {
        require(msg.sender == matchingEngine || msg.sender == settlement, "Listing: unauthorized status update");
        _;
    }

    /// @notice Allows the deployer to wire the contract addresses post-deployment.
    function setAuthorizedContracts(address _matchingEngine, address _settlement) external {
        // In a real production app, this should be protected by an owner modifier.
        // For the MVP, we just set it once during deployment.
        require(matchingEngine == address(0), "Already set");
        matchingEngine = _matchingEngine;
        settlement = _settlement;
    }

    /// @notice Creates a new listing for food surplus.
    function createListing(
        uint8   foodType,
        uint256 quantity,
        uint256 expiryTimestamp,
        uint8   qualityTier,
        bytes32 locationHash,
        string  calldata metadataURI
    ) external returns (uint256) {
        require(expiryTimestamp > block.timestamp, "Listing: expiry must be in the future");
        require(quantity > 0, "Listing: quantity must be positive");

        uint256 listingId = nextListingId++;

        _listings[listingId] = ListingData({
            donor: msg.sender,
            foodType: foodType,
            quantity: quantity,
            expiryTimestamp: expiryTimestamp,
            qualityTier: qualityTier,
            locationHash: locationHash,
            metadataURI: metadataURI,
            status: Status.Open,
            createdAt: block.timestamp
        });

        emit ListingCreated(listingId, msg.sender, expiryTimestamp);
        return listingId;
    }

    /// @notice Cancels an open listing. Only the donor can cancel.
    function cancelListing(uint256 listingId) external {
        ListingData storage listing = _listings[listingId];
        require(listing.donor == msg.sender, "Listing: only donor can cancel");
        require(listing.status == Status.Open, "Listing: only Open listings can be cancelled");

        listing.status = Status.Cancelled;
        emit ListingCancelled(listingId);
    }

    /// @notice Implementation of IListing interface for Settlement/MatchingEngine reads.
    function getListing(uint256 listingId) external view override returns (ListingData memory) {
        return _listings[listingId];
    }

    /// @notice Updates the listing status (called by MatchingEngine or Settlement).
    function updateStatus(uint256 listingId, Status newStatus) external onlyMatchingEngineOrSettlement {
        ListingData storage listing = _listings[listingId];
        require(listing.donor != address(0), "Listing: does not exist");
        listing.status = newStatus;
        emit ListingStatusUpdated(listingId, uint8(newStatus));
    }
}
