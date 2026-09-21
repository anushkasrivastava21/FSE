import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsConfigService } from "../config/contracts.config";
import { encodeFunctionData } from "viem";

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsConfigService,
  ) {}

  /**
   * GET /orders
   *
   * Reads orders from the Prisma cache populated by the Order indexer.
   */
  async findAll(filters: {
    ngoAddress?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.ngoAddress) {
      where.ngoAddress = filters.ngoAddress;
    }

    if (filters.status) {
      where.chainStatus = filters.status;
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const [orders, total] = await Promise.all([
      this.prisma.ordersCache.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.ordersCache.count({ where }),
    ]);

    return {
      data: orders.map(this.serializeOrder),
      total,
      limit,
      offset,
    };
  }

  /**
   * GET /orders/:id
   */
  async findOne(orderId: string) {
    const order = await this.prisma.ordersCache.findUnique({
      where: {
        orderId,
      },
    });

    if (!order) {
      return null;
    }

    return this.serializeOrder(order);
  }

  /**
   * POST /orders
   *
   * The backend does not hold a private key.
   * It only prepares calldata for the NGO wallet.
   */
  preparePlaceOrderTx(params: {
    quantity: number;
    urgencyFlag: boolean;
    locationHash: string;
  }) {
    const calldata = encodeFunctionData({
      abi: this.contracts.orderAbi,
      functionName: "placeOrder",
      args: [
        BigInt(params.quantity),
        params.urgencyFlag,
        params.locationHash as `0x${string}`,
      ],
    });

    return {
      to: this.contracts.orderAddress,
      data: calldata,
      chainId: parseInt(
        process.env.CHAIN_ID || "80002",
        10,
      ),
    };
  }

  /**
   * POST /orders/:id/cancel
   *
   * Prepares an unsigned cancelOrder transaction.
   */
  prepareCancelOrderTx(orderId: string) {
    const calldata = encodeFunctionData({
      abi: this.contracts.orderAbi,
      functionName: "cancelOrder",
      args: [BigInt(orderId)],
    });

    return {
      to: this.contracts.orderAddress,
      data: calldata,
      chainId: parseInt(
        process.env.CHAIN_ID || "80002",
        10,
      ),
    };
  }

  /**
   * Convert Prisma BigInt fields into JSON-safe strings.
   */
  private serializeOrder(order: any) {
    return {
      ...order,
      quantity: Number(order.quantity),
      createdAt: order.createdAt.toString(),
    };
  }
}
