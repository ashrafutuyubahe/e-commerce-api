import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Cart } from './cart.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  cart: Cart;

  @Column()
  cartId: string;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' })
  product: Product;

  @Column()
  productId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
