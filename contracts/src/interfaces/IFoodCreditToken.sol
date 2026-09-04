// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IFoodCreditToken
/// @notice Interface stub published at Gate 0 so Settlement.sol can call mint()
///         without waiting for Person B's full FoodCreditToken.sol implementation.
/// @dev Full implementation in FoodCreditToken.sol (Person B) — available at Gate 1.
///      Soulbound ERC-721: _beforeTokenTransfer reverts on any transfer except mint/burn.
///      Only Settlement.sol is authorised to call mint() (enforced via AccessControl in impl).
interface IFoodCreditToken {

    /// @notice Mints a soulbound Food Credit Token to the donor on successful delivery.
    /// @dev Called exclusively by Settlement.sol in the Delivered HandoffStage.
    ///      Token is non-transferable (soulbound) — represents permanent proof of donation.
    /// @param donor        Wallet address of the donor — token is minted to this address.
    /// @param matchId      bytes32 match ID — ties the token to a specific match on-chain.
    /// @param metadataURI  IPFS CID — taken from IListing.getListing(listingId).metadataURI.
    function mint(
        address donor,
        bytes32 matchId,
        string calldata metadataURI
    ) external;
}
