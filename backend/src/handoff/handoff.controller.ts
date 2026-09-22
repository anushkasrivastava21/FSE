import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { HandoffService } from "./handoff.service";

@ApiTags("Handoffs")
@Controller("handoffs")
export class HandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Get()
  @ApiOperation({
    summary: "Get cached custody handoffs",
  })
  @ApiQuery({
    name: "matchId",
    required: false,
    description: "Filter by match ID",
  })
  @ApiQuery({
    name: "stage",
    required: false,
    type: Number,
    description:
      "0 = PickedUp, 1 = InTransit, 2 = Delivered",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
  })
  async findAll(
    @Query("matchId") matchId?: string,
    @Query("stage") stage?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.handoffService.findAll({
      matchId,
      stage: stage !== undefined ? parseInt(stage, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(":matchId")
  @ApiOperation({
    summary: "Get complete custody trail for a match",
  })
  @ApiParam({
    name: "matchId",
    description: "MatchingEngine match ID (bytes32)",
  })
  async findByMatchId(@Param("matchId") matchId: string) {
    return this.handoffService.findByMatchId(matchId);
  }

  @Post()
  @ApiOperation({
    summary: "Prepare an unsigned recordHandoff transaction",
    description:
      "Returns encoded calldata for the caller's wallet to sign and broadcast.",
  })
  prepareRecordHandoffTransaction(
    @Body()
    body: {
      matchId: string;
      stage: number;
      actor: string;
    },
  ) {
    return this.handoffService.prepareRecordHandoffTx(body);
  }
}
