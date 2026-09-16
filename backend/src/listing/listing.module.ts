import { Module } from "@nestjs/common";
import { ListingController } from "./listing.controller";
import { ListingService } from "./listing.service";
import { ListingIndexer } from "./listing.indexer";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Module({
  controllers: [ListingController],
  providers: [ListingService, ListingIndexer, PrismaService, ContractsConfigService],
  exports: [ListingService],
})
export class ListingModule {}
