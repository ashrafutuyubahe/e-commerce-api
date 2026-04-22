import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'User cart with items' })
  getCart(@CurrentUser() user: User) {
    return this.cartService.getOrCreateCart(user);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  addItem(@Body() addToCartDto: AddToCartDto, @CurrentUser() user: User) {
    return this.cartService.addItem(addToCartDto, user);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @CurrentUser() user: User,
  ) {
    return this.cartService.updateItem(itemId, updateCartItemDto, user);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.cartService.removeItem(itemId, user);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear entire cart' })
  clearCart(@CurrentUser() user: User) {
    return this.cartService.clearCart(user);
  }
}
