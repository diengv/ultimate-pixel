import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const cacheType = configService.get('cache.type');
        
        if (cacheType === 'redis') {
          return {
            store: redisStore,
            host: configService.get('cache.redis.host'),
            port: configService.get('cache.redis.port'),
            password: configService.get('cache.redis.password') || undefined,
            db: configService.get('cache.redis.db'),
            ttl: configService.get('cache.ttl'),
          } as RedisClientOptions;
        }
        
        // File-based cache (default)
        return {
          ttl: configService.get('cache.ttl'),
          max: 100, // Maximum number of items in the cache
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}