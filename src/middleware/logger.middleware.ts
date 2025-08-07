import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const logToFile = this.configService.get('logger.toFile');
    const logLevel = this.configService.get('logger.level');
    const logPath = this.configService.get('logger.filePath');
    const maxSize = this.configService.get('logger.maxSize');
    const maxFiles = this.configService.get('logger.maxFiles');

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          }),
        ),
      }),
    ];

    if (logToFile) {
      // Ensure log directory exists
      if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true });
      }

      transports.push(
        new DailyRotateFile({
          filename: path.join(logPath, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize,
          maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      transports.push(
        new DailyRotateFile({
          filename: path.join(logPath, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize,
          maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      transports,
    });
  }

  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const start = Date.now();
    const { method, url } = req;
    const userAgent = req.headers['user-agent'] || '';
    const ip = this.getClientIp(req);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      
      const logData = {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      };

      if (statusCode >= 400) {
        this.logger.error('HTTP Request Error', logData);
      } else {
        this.logger.info('HTTP Request', logData);
      }
    });

    next();
  }

  private getClientIp(req: any): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1'
    );
  }
}
