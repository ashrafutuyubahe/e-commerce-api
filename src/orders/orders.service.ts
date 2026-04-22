import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
  ) {}

  async createFromCart(createOrderDto: CreateOrderDto, user: User): Promise<Order> {
    const cart = await this.cartService.getOrCreateCart(user);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let totalAmount = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const cartItem of cart.items) {
      const product = await this.productsService.findOne(cartItem.productId);

      if (product.stock < cartItem.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        );
      }

      totalAmount += Number(product.price) * cartItem.quantity;

      orderItems.push({
        productId: product.id,
        product,
        productName: product.name,
        price: product.price,
        quantity: cartItem.quantity,
      });
    }

    const order = this.ordersRepository.create({
      user,
      userId: user.id,
      shippingAddress: createOrderDto.shippingAddress,
      notes: createOrderDto.notes,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.ordersRepository.save(order);

    for (const item of orderItems) {
      const orderItem = this.orderItemsRepository.create({
        ...item,
        orderId: savedOrder.id,
      });
      await this.orderItemsRepository.save(orderItem);
      await this.productsService.decrementStock(item.productId!, item.quantity!);
    }

    await this.cartService.clearCart(user);

    return this.findOne(savedOrder.id, user);
  }

  async findAll(user: User): Promise<Order[]> {
    if (user.role === UserRole.ADMIN) {
      return this.ordersRepository.find({
        relations: ['user', 'items', 'items.product'],
        order: { createdAt: 'DESC' },
      });
    }

    return this.ordersRepository.find({
      where: { userId: user.id },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot access this order');
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    user: User,
  ): Promise<Order> {
    const order = await this.findOne(id, user);

    if (user.role !== UserRole.ADMIN) {
      if (updateOrderStatusDto.status !== OrderStatus.CANCELLED) {
        throw new ForbiddenException('Customers can only cancel orders');
      }
      const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
      if (!cancellableStatuses.includes(order.status)) {
        throw new BadRequestException(
          `Cannot cancel order in status: ${order.status}`,
        );
      }
    }

    if (
      updateOrderStatusDto.status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      for (const item of order.items) {
        if (item.productId) {
          await this.productsService.incrementStock(item.productId, item.quantity);
        }
      }
    }

    order.status = updateOrderStatusDto.status;
    if (updateOrderStatusDto.trackingNumber) {
      order.trackingNumber = updateOrderStatusDto.trackingNumber;
    }

    return this.ordersRepository.save(order);
  }
}
