import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthService } from './auth.service';

const mockUser: User = {
  id: 'uuid-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'hashed',
  role: UserRole.CUSTOMER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  hashPassword: jest.fn(),
  validatePassword: jest.fn().mockResolvedValue(true),
  get fullName() {
    return 'John Doe';
  },
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.expiration': '15m',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiration': '7d',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password1!',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(result.tokens.refreshToken).toBe('mock-token');
      expect(mockUsersService.create).toHaveBeenCalledTimes(1);
    });

    it('should propagate ConflictException from UsersService', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(
        authService.register({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password1!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'john@example.com',
        password: 'Password1!',
      });

      expect(result.tokens.accessToken).toBe('mock-token');
      expect(mockUser.validatePassword).toHaveBeenCalledWith('Password1!');
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'no@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const userWithBadPw = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(false),
      };
      mockUsersService.findByEmail.mockResolvedValue(userWithBadPw);

      await expect(
        authService.login({ email: 'john@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login({ email: 'john@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for active user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await authService.refreshTokens('uuid-1');
      expect(result.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockUsersService.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(authService.refreshTokens('uuid-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
