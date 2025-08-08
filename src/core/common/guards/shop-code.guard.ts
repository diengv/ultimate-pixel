import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ShopifyShop } from '../../entities/shopify-shop.entity';

@Injectable()
export class ShopCodeGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const shopCode = request.headers['x-shop-code'] as string;
    const authorizationHeader = request.headers.authorization;

    if (!shopCode) {
      throw new UnauthorizedException('x-shop-code header is required');
    }

    // Extract token from Authorization header
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authorizationHeader.substring(7);

    // Find shop by shop_code
    const shop = await ShopifyShop.findOne({
      where: { shop_code: shopCode }
    });

    if (!shop) {
      throw new UnauthorizedException('Invalid shop code');
    }

    // Validate that the token matches the shop's installation token
    if (!shop.installation_token || shop.installation_token !== token) {
      throw new UnauthorizedException('Token does not match the installed client');
    }

    // Attach shop info to request for later use
    request['shop'] = shop;
    
    return true;
  }
}