import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDonorAddress(donorAddress: string) {
    const tokens = await this.prisma.foodCreditTokens.findMany({
      where: {
        donorAddress,
      },
      orderBy: {
        mintedAt: "desc",
      },
    });

    return {
      donorAddress,
      data: tokens.map(this.serializeToken),
      total: tokens.length,
    };
  }

  async findByMatchId(matchId: string) {
    const tokens = await this.prisma.foodCreditTokens.findMany({
      where: {
        matchId,
      },
      orderBy: {
        mintedAt: "desc",
      },
    });

    return {
      matchId,
      data: tokens.map(this.serializeToken),
      total: tokens.length,
    };
  }

  private serializeToken(token: any) {
    return {
      ...token,
      mintedAt: token.mintedAt.toString(),
    };
  }
}
