// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IForecastRegistry.sol";

contract MockForecastRegistry is IForecastRegistry {
    mapping(address => Forecast[]) private _forecasts;

    function submitForecast(uint256 periodId, uint256 expectedDemand) external override {
        _forecasts[msg.sender].push(Forecast({
            ngo: msg.sender,
            periodId: periodId,
            expectedDemand: expectedDemand,
            actualFulfilled: 0,
            accuracyScore: 0,
            scored: false
        }));
        emit ForecastSubmitted(msg.sender, periodId, expectedDemand);
    }

    function scoreForecast(address ngo, uint256 periodId, uint256 actualFulfilled) external override {
        Forecast[] storage list = _forecasts[ngo];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].periodId == periodId && !list[i].scored) {
                list[i].actualFulfilled = actualFulfilled;
                list[i].accuracyScore = 100;
                list[i].scored = true;
                emit ForecastScored(ngo, periodId, 100);
                break;
            }
        }
    }

    function getNGOAccuracyHistory(address ngo) external view override returns (Forecast[] memory) {
        return _forecasts[ngo];
    }
}