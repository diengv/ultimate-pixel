import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopifyModule } from './modules/shopify/shopify.module';
import configs from './configs';
import { AppCacheModule } from './core/cache.module';
import { StorageModule } from './core/storage/storage.module';
import { LogCleanupService } from './core/services/log-cleanup.service';
import { JwtAuthGuard } from './core/common/guards/jwt-auth.guard';
import { RolesGuard } from './core/common/guards/roles.guard';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { IpFilterMiddleware } from './middleware/ip-filter.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      cache: true,
      expandVariables: true
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
    }),
    ScheduleModule.forRoot(),
    AppCacheModule,
    StorageModule,
    ShopifyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LogCleanupService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpFilterMiddleware, LoggerMiddleware)
      .forRoutes('*');
  }
}
