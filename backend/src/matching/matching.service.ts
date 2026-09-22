import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /matches/:id — single match record
   */
  async findOne(matchId: string) {
    const match = await this.prisma.matchesCache.findUnique({
      where: { matchId },
    });

    if (!match) {
      return null;
    }

    return this.serializeMatch(match);
  }

  /**
   * GET /matches — list recent matches
   */
  async findAll(filters: { listingId?: string; limit?: number; offset?: number }) {
    const where: any = {};

    if (filters.listingId) {
      where.listingId = filters.listingId;
    }

    const [matches, total] = await Promise.all([
      this.prisma.matchesCache.findMany({
        where,
        orderBy: { matchedAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.matchesCache.count({ where }),
    ]);

    return {
      data: matches.map(this.serializeMatch),
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  private serializeMatch(match: any) {
    return {
      ...match,
      urgencyAtMatch: match.urgencyAtMatch.toString(),
      matchedAt: match.matchedAt.toString(),
    };
  }
}
