import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  async getNgoAccuracyHistory(ngoAddress: string) {
    return this.prisma.forecastsCache.findMany({
      where: {
        ngoAddress: ngoAddress.toLowerCase(),
        scored: true,
      },
      orderBy: {
        period: "asc",
      },
    });
  }

  async getScoredForecasts() {
    return this.prisma.forecastsCache.findMany({
      where: {
        scored: true,
      },
      orderBy: {
        period: "desc",
      },
    });
  }

  async getPendingForecasts() {
    return this.prisma.forecastsCache.findMany({
      where: {
        scored: false,
      },
      orderBy: {
        period: "asc",
      },
    });
  }

  async getDashboardTicker() {
    // Total Open Listings
    const totalListings = await this.prisma.listingsCache.count({
      where: { chainStatus: "Open" },
    });

    // Total Open Orders
    const totalOrders = await this.prisma.ordersCache.count({
      where: { chainStatus: "Open" },
    });

    // Recent trades (Matches)
    const recentTrades = await this.prisma.matchesCache.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Simplified stats for now
    return {
      totalListings,
      totalOrders,
      tradeVolumeToday: recentTrades.length,
      recentTrades,
    };
  }
}
