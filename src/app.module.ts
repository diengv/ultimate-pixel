import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { JwtAuthGuard } from './core/common/guards/jwt-auth.guard';
import { RolesGuard } from './core/common/guards/roles.guard';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { IpFilterMiddleware } from './middleware/ip-filter.middleware';
import { CommonModule } from './core/common/common.module';
import { I18nService } from './core/i18n/i18n.service';
import { I18nInterceptor } from './core/i18n/i18n.interceptor';
import { ShopInfo } from './modules/shopify/entities/shop-info.entity';

@Module({
  imports: [CommonModule, ShopifyModule],
  controllers: [AppController],
  providers: [
    I18nService,
    {
      provide: APP_INTERCEPTOR,
      useClass: I18nInterceptor,
    },
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
    consumer.apply(IpFilterMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
