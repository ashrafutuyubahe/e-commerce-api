import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesService } from './categories.service';

const mockCategory: Partial<Category> = {
  id: 'cat-uuid-1',
  name: 'Electronics',
  slug: 'electronics',
  isActive: true,
};

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create category with auto slug', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockCategory);
      mockRepository.save.mockResolvedValue(mockCategory);

      const result = await service.create({ name: 'Electronics' });

      expect(result).toEqual(mockCategory);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'electronics' }),
      );
    });

    it('should throw ConflictException if name or slug exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockCategory);

      await expect(service.create({ name: 'Electronics' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('should return category by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockCategory);
      const result = await service.findOne('cat-uuid-1');
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all active categories', async () => {
      mockRepository.find.mockResolvedValue([mockCategory]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should remove category', async () => {
      mockRepository.findOne.mockResolvedValue(mockCategory);
      mockRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove('cat-uuid-1')).resolves.toBeUndefined();
    });
  });
});
