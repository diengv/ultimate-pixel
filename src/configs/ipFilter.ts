import { registerAs } from '@nestjs/config';

/**
 *
 */
export default registerAs('ipFilter', () => ({
  enabled: process.env.IP_FILTER_ENABLED === 'true',
  // ex: ['192.168.1.1','192.168.1.1-192.168.1.255']
  blockIps: [],
}));
