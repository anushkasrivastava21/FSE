import { Controller, Get, Param } from "@nestjs/common";
import { ForecastService } from "./forecast.service";

@Controller()
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get("ngos/:address/accuracy")
  async getNgoAccuracyHistory(@Param("address") address: string) {
    return this.forecastService.getNgoAccuracyHistory(address);
  }

  @Get("forecasts/scored")
  async getScoredForecasts() {
    return this.forecastService.getScoredForecasts();
  }

  @Get("forecasts/pending")
  async getPendingForecasts() {
    return this.forecastService.getPendingForecasts();
  }

  @Get("dashboard/ticker")
  async getDashboardTicker() {
    return this.forecastService.getDashboardTicker();
  }
}
