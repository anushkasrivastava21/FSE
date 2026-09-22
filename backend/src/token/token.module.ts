import { Module } from "@nestjs/common";
import { TokenController } from "./token.controller";
import { TokenService } from "./token.service";
import { TokenIndexer } from "./token.indexer";

@Module({
  controllers: [TokenController],
  providers: [TokenService, TokenIndexer],
})
export class TokenModule {}
