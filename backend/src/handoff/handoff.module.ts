import { Module } from "@nestjs/common";
import { HandoffController } from "./handoff.controller";
import { HandoffService } from "./handoff.service";
import { HandoffIndexer } from "./handoff.indexer";

@Module({
  controllers: [HandoffController],
  providers: [HandoffService, HandoffIndexer],
})
export class HandoffModule {}
