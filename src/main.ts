import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const corsConfig = configService.get('cors');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check domains
      const allowedDomains = corsConfig.domain || [];
      const isAllowedDomain = allowedDomains.some((domain: string) => {
        if (domain === 'localhost') {
          return origin.includes('localhost');
        }
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2);
          return origin.includes(baseDomain);
        }
        return origin.includes(domain);
      });

      if (isAllowedDomain) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: corsConfig.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // HTTP methods from config
    credentials: true, // Use if credentials (cookies, headers) are necessary
  });

  await app.listen(port);
  console.log(`Server is running on port ${port}`);
}

bootstrap().catch(err => {
  console.error('Error starting the server:', err);
});