// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IForecastRegistry {
    struct Forecast {
        address ngo;
        uint256 periodId;
        uint256 expectedDemand;
        uint256 actualFulfilled;
        uint256 accuracyScore;
        bool scored;
    }

    event ForecastSubmitted(address indexed ngo, uint256 indexed periodId, uint256 expectedDemand);
    event ForecastScored(address indexed ngo, uint256 indexed periodId, uint256 accuracyScore);

    function submitForecast(uint256 periodId, uint256 expectedDemand) external;
    function scoreForecast(address ngo, uint256 periodId, uint256 actualFulfilled) external;
    function getNGOAccuracyHistory(address ngo) external view returns (Forecast[] memory);
}