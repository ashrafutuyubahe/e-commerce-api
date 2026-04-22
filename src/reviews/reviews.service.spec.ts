import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from '../products/products.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

const mockUser: Partial<User> = {
  id: 'user-uuid-1',
  email: 'user@example.com',
  role: UserRole.CUSTOMER,
  isActive: true,
};

const mockAdminUser: Partial<User> = {
  id: 'admin-uuid-1',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  isActive: true,
};

const mockReview: Partial<Review> = {
  id: 'review-uuid-1',
  userId: 'user-uuid-1',
  productId: 'prod-uuid-1',
  rating: 5,
  comment: 'Great!',
};

const mockQueryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue({ avg: '4.5', count: '10' }),
};

const mockReviewRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockProductsService = {
  findOne: jest.fn().mockResolvedValue({ id: 'prod-uuid-1', name: 'Test', stock: 10 }),
  updateRating: jest.fn().mockResolvedValue(undefined),
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: mockReviewRepository },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
    mockProductsService.findOne.mockResolvedValue({ id: 'prod-uuid-1', name: 'Test', stock: 10 });
    mockReviewRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockProductsService.updateRating.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('should create a review', async () => {
      mockReviewRepository.findOne.mockResolvedValue(null);
      mockReviewRepository.create.mockReturnValue(mockReview);
      mockReviewRepository.save.mockResolvedValue(mockReview);

      const result = await service.create(
        { productId: 'prod-uuid-1', rating: 5, comment: 'Great!' },
        mockUser as User,
      );

      expect(result).toEqual(mockReview);
      expect(mockProductsService.updateRating).toHaveBeenCalled();
    });

    it('should throw ConflictException if already reviewed', async () => {
      mockReviewRepository.findOne.mockResolvedValue(mockReview);

      await expect(
        service.create(
          { productId: 'prod-uuid-1', rating: 4 },
          mockUser as User,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should allow owner to delete review', async () => {
      mockReviewRepository.findOne.mockResolvedValue({ ...mockReview });
      mockReviewRepository.remove.mockResolvedValue(undefined);

      await expect(
        service.remove('review-uuid-1', mockUser as User),
      ).resolves.toBeUndefined();
    });

    it('should allow admin to delete any review', async () => {
      mockReviewRepository.findOne.mockResolvedValue({
        ...mockReview,
        userId: 'someone-else',
      });
      mockReviewRepository.remove.mockResolvedValue(undefined);

      await expect(
        service.remove('review-uuid-1', mockAdminUser as User),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException if not owner or admin', async () => {
      mockReviewRepository.findOne.mockResolvedValue({
        ...mockReview,
        userId: 'other-user',
      });

      await expect(
        service.remove('review-uuid-1', mockUser as User),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
