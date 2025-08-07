import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class IpFilterMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  private ipRangeCheck(ip: string, range: string): boolean {
    // Handle single IP
    if (!range.includes('/')) {
      return ip === range;
    }

    // Handle CIDR notation (e.g., 192.168.1.0/24)
    const [rangeIp, prefixLength] = range.split('/');
    const prefix = parseInt(prefixLength, 10);

    const ipToNumber = (ipStr: string): number => {
      return ipStr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    };

    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(rangeIp);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;

    return (ipNum & mask) === (rangeNum & mask);
  }

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const ipBlockList = this.configService.get<string[]>('ipFilter.blockIps');
    const requestIP = req.ip || req.socket.remoteAddress;

    // Check if IP is blocked
    if (requestIP && ipBlockList?.length) {
      const isBlocked = ipBlockList.some((ipOrRange) => this.ipRangeCheck(requestIP, ipOrRange));

      if (isBlocked) {
        return res.status(403).send('Access denied.');
      }
    }

    next();
  }

}