import { registerAs } from '@nestjs/config';

const REDIS_PORT = process.env.REDIS_PORT || '6379';
const REDIS_DB = process.env.REDIS_DB || '0';
const CACHE_TTL = process.env.CACHE_TTL || '3600';

export default registerAs('cache', () => ({
  type: process.env.CACHE_TYPE || 'file',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(REDIS_DB, 10) || 0,
  },
  ttl: parseInt(CACHE_TTL, 10) || 3600,
}));
