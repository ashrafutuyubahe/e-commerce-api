import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';

/**
 * E2E tests require a running PostgreSQL instance with the ecommerce_db database.
 * Set up via environment variables or use the default .env config.
 *
 * Run: npm run test:e2e
 */
describe('E-Commerce API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(
      new TransformInterceptor(),
      new ClassSerializerInterceptor(reflector),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestP@ss123';

    it('POST /api/v1/auth/register — should register a user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(res.body.data.tokens.accessToken).toBeDefined();
      accessToken = res.body.data.tokens.accessToken;
    });

    it('POST /api/v1/auth/login — should login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('POST /api/v1/auth/login — should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);
    });

    it('POST /api/v1/auth/register — should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Dupe',
          lastName: 'User',
          email: testEmail,
          password: testPassword,
        })
        .expect(409);
    });
  });

  describe('Products (public)', () => {
    it('GET /api/v1/products — should return paginated products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      expect(res.body.data).toHaveProperty('meta');
      expect(res.body.data).toHaveProperty('data');
    });
  });

  describe('Categories (public)', () => {
    it('GET /api/v1/categories — should return categories list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Users (protected)', () => {
    it('GET /api/v1/users/me — should return current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBeDefined();
    });

    it('GET /api/v1/users/me — should reject unauthenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('Cart (protected)', () => {
    it('GET /api/v1/cart — should return user cart', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('items');
    });
  });
});
