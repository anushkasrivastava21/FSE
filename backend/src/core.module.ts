import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { ContractsConfigService } from "./config/contracts.config";

@Global()
@Module({
  providers: [PrismaService, ContractsConfigService],
  exports: [PrismaService, ContractsConfigService],
})
export class CoreModule {}
