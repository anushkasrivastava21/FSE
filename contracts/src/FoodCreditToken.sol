// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract FoodCreditToken is ERC721, AccessControl {
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

    uint256 private _nextTokenId = 1;

    struct CreditRecord {
        bytes32 matchId;
        string metadataURI;
    }

    mapping(uint256 => CreditRecord) public credits;
    mapping(bytes32 => uint256) public tokenByMatchId;

    event FoodCreditMinted(
        uint256 indexed tokenId,
        address indexed donor,
        bytes32 indexed matchId,
        string metadataURI
    );

    constructor() ERC721("Food Credit", "FCT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setSettlement(address settlement)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(settlement != address(0), "invalid settlement address");
        _grantRole(SETTLEMENT_ROLE, settlement);
    }

    function revokeSettlement(address settlement)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _revokeRole(SETTLEMENT_ROLE, settlement);
    }

    function mint(
        address donor,
        bytes32 matchId,
        string calldata metadataURI
    ) external onlyRole(SETTLEMENT_ROLE) {
        require(donor != address(0), "invalid donor");
        require(matchId != bytes32(0), "invalid matchId");
        require(tokenByMatchId[matchId] == 0, "credit already minted");

        uint256 tokenId = _nextTokenId++;

        _safeMint(donor, tokenId);

        credits[tokenId] = CreditRecord({
            matchId: matchId,
            metadataURI: metadataURI
        });

        tokenByMatchId[matchId] = tokenId;

        emit FoodCreditMinted(
            tokenId,
            donor,
            matchId,
            metadataURI
        );
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "token does not exist");
        return credits[tokenId].metadataURI;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) and burning (to == address(0)).
        // Block all normal transfers.
        require(
            from == address(0) || to == address(0),
            "Food Credit Token is soulbound"
        );

        return super._update(to, tokenId, auth);
    }
    function supportsInterface(bytes4 interfaceId)
	public
	view
	override(ERC721, AccessControl)
	returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
