import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  expiration: process.env.JWT_EXPIRATION || '15m',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    'fallback-refresh-secret-change-in-production',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
