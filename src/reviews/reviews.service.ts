import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    private readonly productsService: ProductsService,
  ) {}

  async create(createReviewDto: CreateReviewDto, user: User): Promise<Review> {
    await this.productsService.findOne(createReviewDto.productId);

    const existing = await this.reviewsRepository.findOne({
      where: { userId: user.id, productId: createReviewDto.productId },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const review = this.reviewsRepository.create({
      ...createReviewDto,
      userId: user.id,
      user,
    });

    const saved = await this.reviewsRepository.save(review);
    await this.recalculateProductRating(createReviewDto.productId);
    return saved;
  }

  async findByProduct(productId: string): Promise<Review[]> {
    await this.productsService.findOne(productId);
    return this.reviewsRepository.find({
      where: { productId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });
    if (!review) {
      throw new NotFoundException(`Review ${id} not found`);
    }
    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, user: User): Promise<Review> {
    const review = await this.findOne(id);

    if (review.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot edit this review');
    }

    Object.assign(review, updateReviewDto);
    const saved = await this.reviewsRepository.save(review);
    await this.recalculateProductRating(review.productId);
    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const review = await this.findOne(id);

    if (review.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot delete this review');
    }

    const productId = review.productId;
    await this.reviewsRepository.remove(review);
    await this.recalculateProductRating(productId);
  }

  private async recalculateProductRating(productId: string): Promise<void> {
    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.productId = :productId', { productId })
      .getRawOne();

    const averageRating = result?.avg ? parseFloat(parseFloat(result.avg).toFixed(1)) : 0;
    const reviewCount = result?.count ? parseInt(result.count, 10) : 0;

    await this.productsService.updateRating(productId, averageRating, reviewCount);
  }
}
