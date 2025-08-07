import { registerAs } from '@nestjs/config';
import * as process from 'node:process';
export default registerAs('cors', () => ({
  domain: ['localhost', '*.diengv.com', process.env.CLIENT_APP_URL],
  ipBlock: [],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
