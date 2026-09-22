// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IOrder.sol";

contract MockOrder is IOrder {
    mapping(uint256 => OrderData) public orders;

    function setMockOrder(
        uint256 orderId,
        address ngoAddress,
        uint256 quantity,
        bool urgencyFlag,
        bytes32 locationHash,
        Status status,
        uint256 createdAt
    ) external {
        orders[orderId] = OrderData({
            ngoAddress: ngoAddress,
            quantity: quantity,
            urgencyFlag: urgencyFlag,
            locationHash: locationHash,
            status: status,
            createdAt: createdAt
        });
    }

    function getOrder(uint256 orderId) external view override returns (OrderData memory) {
        return orders[orderId];
    }

    function updateStatus(uint256 orderId, Status newStatus) external override {
        orders[orderId].status = newStatus;
    }
}
