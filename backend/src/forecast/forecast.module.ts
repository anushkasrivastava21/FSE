import { Module } from "@nestjs/common";
import { ForecastService } from "./forecast.service";
import { ForecastController } from "./forecast.controller";
import { ForecastIndexer } from "./forecast.indexer";
import { ForecastCronService } from "./forecast-cron.service";

@Module({
  controllers: [ForecastController],
  providers: [ForecastService, ForecastIndexer, ForecastCronService],
  exports: [ForecastService],
})
export class ForecastModule {}
