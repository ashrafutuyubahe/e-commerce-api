import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';

  app.use(helmet());
  app.enableCors({
    origin: nodeEnv === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

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
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new ClassSerializerInterceptor(reflector),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription(
      `## Production-grade NestJS E-Commerce REST API

### Features
- **Auth**: JWT access + refresh tokens, role-based access control
- **Users**: Profile management (customer/admin roles)
- **Categories**: Hierarchical category tree with slugs
- **Products**: Full CRUD with search, filter, pagination, and ratings
- **Cart**: Per-user cart with real-time stock validation
- **Orders**: Full order lifecycle with automatic stock management
- **Reviews**: Product reviews with automatic average rating calculation

### Authentication
Use the \`/auth/login\` or \`/auth/register\` endpoints to get a JWT token, then click **Authorize** and paste: \`Bearer <your_token>\``,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication — register, login, token refresh')
    .addTag('users', 'User management')
    .addTag('categories', 'Product categories')
    .addTag('products', 'Product catalog')
    .addTag('cart', 'Shopping cart')
    .addTag('orders', 'Order management')
    .addTag('reviews', 'Product reviews')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port);
  console.log(`\n🚀 Application running on: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger docs:           http://localhost:${port}/api/docs\n`);
}

bootstrap();
