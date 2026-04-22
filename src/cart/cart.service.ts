import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { User } from '../users/entities/user.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
  ) {}

  async getOrCreateCart(user: User): Promise<Cart> {
    let cart = await this.cartsRepository.findOne({
      where: { userId: user.id },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartsRepository.create({ user, userId: user.id, items: [] });
      await this.cartsRepository.save(cart);
    }

    return cart;
  }

  async addItem(addToCartDto: AddToCartDto, user: User): Promise<Cart> {
    const product = await this.productsService.findOne(addToCartDto.productId);

    if (product.stock < addToCartDto.quantity) {
      throw new BadRequestException(
        `Only ${product.stock} units of "${product.name}" available`,
      );
    }

    const cart = await this.getOrCreateCart(user);

    const existingItem = cart.items.find(
      (i) => i.productId === addToCartDto.productId,
    );

    if (existingItem) {
      const newQty = existingItem.quantity + addToCartDto.quantity;
      if (newQty > product.stock) {
        throw new BadRequestException(
          `Cannot add ${addToCartDto.quantity} more. Only ${product.stock - existingItem.quantity} more available`,
        );
      }
      existingItem.quantity = newQty;
      await this.cartItemsRepository.save(existingItem);
    } else {
      const item = this.cartItemsRepository.create({
        cart,
        cartId: cart.id,
        product,
        productId: product.id,
        quantity: addToCartDto.quantity,
      });
      await this.cartItemsRepository.save(item);
    }

    return this.getOrCreateCart(user);
  }

  async updateItem(
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
    user: User,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(user);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    const product = await this.productsService.findOne(item.productId);
    if (updateCartItemDto.quantity > product.stock) {
      throw new BadRequestException(
        `Only ${product.stock} units available`,
      );
    }

    item.quantity = updateCartItemDto.quantity;
    await this.cartItemsRepository.save(item);
    return this.getOrCreateCart(user);
  }

  async removeItem(itemId: string, user: User): Promise<Cart> {
    const cart = await this.getOrCreateCart(user);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    await this.cartItemsRepository.remove(item);
    return this.getOrCreateCart(user);
  }

  async clearCart(user: User): Promise<void> {
    const cart = await this.getOrCreateCart(user);
    await this.cartItemsRepository.delete({ cartId: cart.id });
  }
}
