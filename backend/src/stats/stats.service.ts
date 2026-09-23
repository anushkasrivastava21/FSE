import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getSystemStats() {
    const activeListings = await this.prisma.listingsCache.count({
      where: { chainStatus: "Open" },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const matchesToday = await this.prisma.matchesCache.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    const volumeResult = await this.prisma.listingsCache.aggregate({
      _sum: {
        quantity: true,
      },
    });
    
    const volume = volumeResult._sum.quantity || 0;

    return {
      activeListings,
      matchesToday,
      volume,
    };
  }
}
