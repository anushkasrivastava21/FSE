import { Module } from "@nestjs/common";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";
import { CoreModule } from "../core.module";

@Module({
  imports: [CoreModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
