import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const slug = this.slugify(createProductDto.name);

    const existing = await this.productsRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Product with slug "${slug}" already exists`);
    }

    const product = this.productsRepository.create({ ...createProductDto, slug });
    return this.productsRepository.save(product);
  }

  async findAll(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const {
      page = 1,
      limit = 12,
      search,
      categoryId,
      minPrice,
      maxPrice,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    if (search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    const validSortFields = ['price', 'createdAt', 'name', 'averageRating'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`product.${safeSortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category', 'reviews'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug, isActive: true },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const slug = this.slugify(updateProductDto.name);
      const existing = await this.productsRepository.findOne({ where: { slug } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Slug "${slug}" already taken`);
      }
      (product as any).slug = slug;
    }

    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async updateRating(productId: string, averageRating: number, reviewCount: number): Promise<void> {
    await this.productsRepository.update(productId, { averageRating, reviewCount });
  }

  async decrementStock(productId: string, quantity: number): Promise<void> {
    await this.productsRepository.decrement({ id: productId }, 'stock', quantity);
  }

  async incrementStock(productId: string, quantity: number): Promise<void> {
    await this.productsRepository.increment({ id: productId }, 'stock', quantity);
  }
}
