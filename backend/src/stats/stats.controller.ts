import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { StatsService } from "./stats.service";

@ApiTags("Stats")
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: "Get aggregated system statistics" })
  async getStats() {
    return this.statsService.getSystemStats();
  }
}
