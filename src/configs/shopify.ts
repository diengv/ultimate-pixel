import { registerAs } from '@nestjs/config';

export default registerAs('shopify', () => ({
  clientID: process.env.SHOPIFY_CLIENT_ID || '',
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  clientUrl: process.env.CLIENT_APP_URL || ''
}));