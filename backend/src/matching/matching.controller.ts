import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { MatchingService } from "./matching.service";

@ApiTags("Matches")
@Controller("matches")
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get()
  @ApiOperation({ summary: "List recent matches" })
  @ApiQuery({ name: "listingId", required: false, description: "Filter by listing ID" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async findAll(
    @Query("listingId") listingId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.matchingService.findAll({
      listingId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a match by its matchId (bytes32 hex)" })
  @ApiParam({ name: "id", description: "Match ID (bytes32 hex string)" })
  async findOne(@Param("id") id: string) {
    const match = await this.matchingService.findOne(id);
    if (!match) {
      throw new NotFoundException(`Match ${id} not found`);
    }
    return match;
  }
}
