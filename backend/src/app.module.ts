import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { CoreModule } from "./core.module";

import { ListingModule } from "./listing/listing.module";
import { MatchingModule } from "./matching/matching.module";
import { IpfsModule } from "./ipfs/ipfs.module";
import { OrderModule } from "./order/order.module";
import { HandoffModule } from "./handoff/handoff.module";
import { TokenModule } from "./token/token.module";
import { ForecastModule } from "./forecast/forecast.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "./.env",
    }),
    ScheduleModule.forRoot(),

    CoreModule,

    ListingModule,
    MatchingModule,
    IpfsModule,
    OrderModule,
    HandoffModule,
    TokenModule,
    ForecastModule,
  ],
  providers: [],
  exports: [],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log(
      "FSE Backend initialized — Listings, Matching & NGO Orders",
    );
  }
}
