// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ForecastRegistry is Ownable {
    struct Forecast {
        uint256 expectedQuantity;
        uint256 actualQuantity;
        uint256 accuracyScore;
        bool scored;
    }

    // ngoAddress => periodId => Forecast
    mapping(address => mapping(uint256 => Forecast)) public forecasts;
    mapping(address => uint256[]) public ngoAccuracyHistory;

    event ForecastSubmitted(address indexed ngo, uint256 indexed period, uint256 expectedQuantity);
    event ForecastScored(address indexed ngo, uint256 indexed period, uint256 accuracyScore);

    constructor() Ownable(msg.sender) {}

    function submitForecast(uint256 period, uint256 expectedQuantity) external {
        require(expectedQuantity > 0, "Invalid quantity");
        forecasts[msg.sender][period] = Forecast(expectedQuantity, 0, 0, false);
        emit ForecastSubmitted(msg.sender, period, expectedQuantity);
    }

    function scoreForecast(address ngo, uint256 period, uint256 actualQuantity) external onlyOwner {
        Forecast storage f = forecasts[ngo][period];
        require(!f.scored, "Already scored");

        uint256 diff = f.expectedQuantity > actualQuantity 
            ? f.expectedQuantity - actualQuantity 
            : actualQuantity - f.expectedQuantity;

        uint256 score = 100;
        if (f.expectedQuantity > 0) {
            uint256 penalty = (diff * 100) / f.expectedQuantity;
            score = penalty >= 100 ? 0 : 100 - penalty;
        }

        f.actualQuantity = actualQuantity;
        f.accuracyScore = score;
        f.scored = true;

        ngoAccuracyHistory[ngo].push(score);
        emit ForecastScored(ngo, period, score);
    }

    function getNGOAccuracyHistory(address ngo) external view returns (uint256[] memory) {
        return ngoAccuracyHistory[ngo];
    }
}