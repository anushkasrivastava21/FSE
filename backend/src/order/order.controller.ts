import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { OrderService } from "./order.service";

@ApiTags("Orders")
@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({
    summary: "Get cached NGO demand orders with optional filters",
  })
  @ApiQuery({
    name: "ngoAddress",
    required: false,
    description: "Filter by NGO wallet address",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by chain status",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
  })
  async findAll(
    @Query("ngoAddress") ngoAddress?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.orderService.findAll({
      ngoAddress,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a single order by on-chain order ID",
  })
  @ApiParam({
    name: "id",
    description: "On-chain order ID",
  })
  async findOne(@Param("id") id: string) {
    const order = await this.orderService.findOne(id);

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return order;
  }

  @Post()
  @ApiOperation({
    summary: "Prepare an unsigned placeOrder transaction",
    description:
      "Returns encoded calldata and the Order contract address for the NGO frontend wallet to sign and broadcast.",
  })
  preparePlaceOrderTransaction(
    @Body()
    body: {
      quantity: number;
      urgencyFlag: boolean;
      locationHash: string;
    },
  ) {
    return this.orderService.preparePlaceOrderTx(body);
  }

  @Post(":id/cancel")
  @ApiOperation({
    summary: "Prepare an unsigned cancelOrder transaction",
    description:
      "Returns encoded calldata for the NGO wallet to sign and broadcast.",
  })
  @ApiParam({
    name: "id",
    description: "On-chain order ID",
  })
  prepareCancelOrderTransaction(@Param("id") id: string) {
    return this.orderService.prepareCancelOrderTx(id);
  }
}
