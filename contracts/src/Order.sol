// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IOrder.sol";

contract Order is AccessControl, IOrder {
    bytes32 public constant NGO_ROLE = keccak256("NGO_ROLE");
    bytes32 public constant MATCHING_ENGINE_ROLE =
        keccak256("MATCHING_ENGINE_ROLE");

    uint256 private _nextOrderId = 1;

    mapping(uint256 => OrderData) private _orders;

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed ngo,
        uint256 quantity,
        bool urgencyFlag,
        bytes32 locationHash
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

    function setMatchingEngine(
        address matchingEngine
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            matchingEngine != address(0),
            "invalid matching engine address"
        );

        _grantRole(MATCHING_ENGINE_ROLE, matchingEngine);
    }

    function revokeMatchingEngine(
        address matchingEngine
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MATCHING_ENGINE_ROLE, matchingEngine);
    }

    function placeOrder(
        uint256 quantity,
        bool urgencyFlag,
        bytes32 locationHash
    ) external onlyRole(NGO_ROLE) returns (uint256 orderId) {
        require(
            quantity > 0,
            "quantity must be greater than zero"
        );

        orderId = _nextOrderId++;

        _orders[orderId] = OrderData({
            ngoAddress: msg.sender,
            quantity: quantity,
            urgencyFlag: urgencyFlag,
            locationHash: locationHash,
            status: Status.Open,
            createdAt: block.timestamp
        });

        emit OrderPlaced(
            orderId,
            msg.sender,
            quantity,
            urgencyFlag,
            locationHash
        );
    }

    function cancelOrder(uint256 orderId) external {
        OrderData storage order = _orders[orderId];

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

    function getOrder(
        uint256 orderId
    ) external view override returns (OrderData memory) {
        return _orders[orderId];
    }

    function updateStatus(
        uint256 orderId,
        Status newStatus
    ) external override onlyRole(MATCHING_ENGINE_ROLE) {
        OrderData storage order = _orders[orderId];

        require(
            order.ngoAddress != address(0),
            "order does not exist"
        );

        require(
            newStatus == Status.Matched,
            "invalid status update"
        );

        require(
            order.status == Status.Open,
            "order is not open"
        );

        order.status = newStatus;
    }
}
