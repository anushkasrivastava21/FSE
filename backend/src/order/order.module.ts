import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { OrderIndexer } from "./order.indexer";

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderIndexer],
})
export class OrderModule {}
