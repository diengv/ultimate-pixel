import { registerAs } from '@nestjs/config';

const origin = process.env.CORS_ORIGIN?.split(',') || [];

/**
 *
 */
export default registerAs('cors', () => ({
  origins: [
    process.env.CLIENT_APP_URL,
    '*localhost*',
    '*.diengv.com',
    ...origin,
  ],
  methods: process.env.CORS_METHODS?.split(',') || [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'OPTIONS',
  ],
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));
