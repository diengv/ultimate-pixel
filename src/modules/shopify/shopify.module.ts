import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { ShopifyShop } from './entities/shopify-shop.entity';
import { ShopInfo } from './entities/shop-info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShopifyShop, ShopInfo])],
  controllers: [ShopifyController],
  providers: [ShopifyService],
  exports: [ShopifyService],
})
export class ShopifyModule {}