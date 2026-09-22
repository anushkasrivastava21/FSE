import {
  Controller,
  Get,
  Param,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { TokenService } from "./token.service";

@ApiTags("Food Credit Tokens")
@Controller("tokens")
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get(":donorAddress")
  @ApiOperation({
    summary: "Get Food Credit Tokens for a donor",
  })
  @ApiParam({
    name: "donorAddress",
    description: "Donor wallet address",
  })
  async findByDonorAddress(
    @Param("donorAddress") donorAddress: string,
  ) {
    return this.tokenService.findByDonorAddress(donorAddress);
  }

  @Get("match/:matchId")
  @ApiOperation({
    summary: "Get Food Credit Tokens for a match",
  })
  @ApiParam({
    name: "matchId",
    description: "MatchingEngine match ID (bytes32)",
  })
  async findByMatchId(
    @Param("matchId") matchId: string,
  ) {
    return this.tokenService.findByMatchId(matchId);
  }
}
