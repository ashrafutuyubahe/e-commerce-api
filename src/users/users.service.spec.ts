import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

const mockUser: Partial<User> = {
  id: 'uuid-1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  role: UserRole.CUSTOMER,
  isActive: true,
};

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and return a user', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        password: 'Password1!',
      });

      expect(result).toEqual(mockUser);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          password: 'Password1!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail('alice@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null when email not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('notfound@example.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockUser });
      mockRepository.save.mockResolvedValue({ ...mockUser, firstName: 'Updated' });

      const result = await service.update('uuid-1', { firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
    });

    it('should throw ConflictException if new email already in use', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockUser })
        .mockResolvedValueOnce({ ...mockUser, id: 'uuid-2', email: 'other@example.com' });

      await expect(
        service.update('uuid-1', { email: 'other@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove the user', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove('uuid-1')).resolves.toBeUndefined();
      expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
    });
  });
});
