import { registerAs } from '@nestjs/config';
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ? process.env.PORT.toString() : '3000', 10),
  environment: process.env.NODE_ENV || 'development',
}));
