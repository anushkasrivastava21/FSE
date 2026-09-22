import { Module } from "@nestjs/common";
import { MatchingController } from "./matching.controller";
import { MatchingService } from "./matching.service";
import { MatchingIndexer } from "./matching.indexer";
import { UrgencyCacheProcessor } from "./urgency-cache.processor";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";

@Module({
  imports: [],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    MatchingIndexer,
    UrgencyCacheProcessor,
    PrismaService,
    ContractsConfigService,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
