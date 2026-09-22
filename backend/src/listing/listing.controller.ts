import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from "@nestjs/swagger";
import { ListingService } from "./listing.service";

@ApiTags("Listings")
@Controller("listings")
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  @ApiOperation({ summary: "Get all listings with optional filters" })
  @ApiQuery({ name: "status", required: false, description: "Filter by chain status (Open, Matched, etc.)" })
  @ApiQuery({ name: "region", required: false, description: "Filter by locationHash" })
  @ApiQuery({ name: "donor", required: false, description: "Filter by donor wallet address" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async findAll(
    @Query("status") status?: string,
    @Query("region") region?: string,
    @Query("donor") donor?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.listingService.findAll({
      status,
      region,
      donor,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single listing by ID" })
  @ApiParam({ name: "id", description: "On-chain listing ID" })
  async findOne(@Param("id") id: string) {
    const listing = await this.listingService.findOne(id);
    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }
    return listing;
  }

  @Post()
  @ApiOperation({
    summary: "Prepare an unsigned createListing transaction",
    description:
      "Returns the encoded calldata and target address for the frontend wallet to sign and broadcast.",
  })
  prepareTransaction(
    @Body()
    body: {
      foodType: number;
      quantity: number;
      expiryTimestamp: number;
      qualityTier: number;
      locationHash: string;
      metadataURI: string;
    },
  ) {
    return this.listingService.prepareCreateListingTx(body);
  }
}
