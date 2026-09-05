// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Order is AccessControl {
    bytes32 public constant NGO_ROLE = keccak256("NGO_ROLE");

    enum Status {
        Open,
        Matched,
        Settled,
        Expired,
        Cancelled
    }

    struct OrderRecord {
        address ngoAddress;
        uint256 quantity;
        bool urgencyFlag;
        bytes32 locationHash;
        Status status;
    }

    uint256 private _nextOrderId = 1;

    mapping(uint256 => OrderRecord) public orders;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed ngoAddress,
        uint256 quantity
    );

    event OrderCancelled(uint256 indexed orderId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerNGO(
        address ngo
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(ngo != address(0), "invalid NGO address");
        _grantRole(NGO_ROLE, ngo);
    }

    function revokeNGO(
        address ngo
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(NGO_ROLE, ngo);
    }

    function placeOrder(
        uint256 quantity,
        bool urgencyFlag,
        bytes32 locationHash
    ) external onlyRole(NGO_ROLE) returns (uint256 orderId) {
        require(quantity > 0, "quantity must be greater than zero");

        orderId = _nextOrderId++;

        orders[orderId] = OrderRecord({
            ngoAddress: msg.sender,
            quantity: quantity,
            urgencyFlag: urgencyFlag,
            locationHash: locationHash,
            status: Status.Open
        });

        emit OrderCreated(orderId, msg.sender, quantity);
    }

    function cancelOrder(uint256 orderId) external {
        OrderRecord storage order = orders[orderId];

        require(
            order.ngoAddress != address(0),
            "order does not exist"
        );

        require(
            order.ngoAddress == msg.sender,
            "not order owner"
        );

        require(
            order.status == Status.Open,
            "order is not open"
        );

        order.status = Status.Cancelled;

        emit OrderCancelled(orderId);
    }
}
