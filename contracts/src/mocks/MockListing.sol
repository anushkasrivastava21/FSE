// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IListing.sol";

contract MockListing is IListing {
    mapping(uint256 => ListingData) private _listings;

    function setListing(
        uint256 listingId,
        address donor,
        string calldata metadataURI
    ) external {
        _listings[listingId] = ListingData({
            donor: donor,
            foodType: 0,
            quantity: 0,
            expiryTimestamp: 0,
            qualityTier: 0,
            locationHash: bytes32(0),
            metadataURI: metadataURI,
            status: Status.Matched,
            createdAt: block.timestamp
        });
    }

    function getListing(uint256 listingId) external view returns (ListingData memory) {
        return _listings[listingId];
    }
}