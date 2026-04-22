import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order from current cart' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty or insufficient stock' })
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.createFromCart(createOrderDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (Admin sees all, customers see own)' })
  findAll(@CurrentUser() user: User) {
    return this.ordersService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (Admin: any status; Customer: cancel only)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user);
  }
}
