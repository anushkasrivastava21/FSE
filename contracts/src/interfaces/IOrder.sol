// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IOrder
/// @notice Interface for Person B's Order contract.
/// @dev MatchingEngine uses this to verify that an NGO's order is valid,
///      open, and the location matches the listing's location.
interface IOrder {
    enum Status { Open, Matched, Cancelled }

    struct OrderData {
        address ngoAddress;
        uint256 quantity;
        bool    urgencyFlag;
        bytes32 locationHash;
        Status  status;
        uint256 createdAt;
    }

    /// @notice Returns full order data for a given orderId.
    /// @param orderId The on-chain order ID.
    function getOrder(uint256 orderId) external view returns (OrderData memory);

    /// @notice Updates the order status to Matched.
    /// @dev Should be restricted to only be callable by the MatchingEngine.
    function updateStatus(uint256 orderId, Status newStatus) external;
}
