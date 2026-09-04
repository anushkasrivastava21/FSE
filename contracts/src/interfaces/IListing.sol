// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IListing
/// @notice Interface published by Person A (Gate 0) so Settlement.sol can read
///         listing data (donor address, metadataURI) without importing the full contract.
/// @dev Full implementation in Listing.sol — available at Gate 1 (Week 4).
interface IListing {

    enum Status { Open, Matched, Settled, Expired, Cancelled }

    struct ListingData {
        address donor;           // wallet address of the donor — Settlement reads this for token mint
        uint8   foodType;        // FoodType enum value
        uint256 quantity;        // in kg or meals
        uint256 expiryTimestamp; // Unix timestamp
        uint8   qualityTier;     // QualityTier enum value
        bytes32 locationHash;    // keccak256(region/pincode)
        string  metadataURI;     // IPFS CID — Settlement passes this to FoodCreditToken.mint()
        Status  status;
        uint256 createdAt;       // block.timestamp at listing creation
    }

    /// @notice Returns the full on-chain listing record for a given listingId.
    /// @dev Settlement calls this on the final Delivered HandoffStage to:
    ///      1. Get donor address for FoodCreditToken.mint()
    ///      2. Get metadataURI (IPFS CID) for the token metadata
    /// @param listingId The on-chain listing ID (uint256).
    /// @return Full ListingData struct.
    function getListing(uint256 listingId) external view returns (ListingData memory);
}
