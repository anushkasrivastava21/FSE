import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ListingModule } from "./listing/listing.module";
import { MatchingModule } from "./matching/matching.module";
import { IpfsModule } from "./ipfs/ipfs.module";
import { PrismaService } from "./prisma/prisma.service";
import { ContractsConfigService } from "./config/contracts.config";

@Module({
  imports: [
    // Load .env from repo root
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../.env",
    }),

    // ScheduleModule for urgency-cache repeatable job
    ScheduleModule.forRoot(),

    ListingModule,
    MatchingModule,
    IpfsModule,
  ],
  providers: [PrismaService, ContractsConfigService],
  exports: [PrismaService, ContractsConfigService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log("FSE Backend initialized — Person A vertical (Listing & Matching)");
  }
}
