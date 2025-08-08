import {
  Controller,
  Post,
  Body,
  HttpException,
  BadRequestException,
  HttpStatus,
  Headers,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyAuthDto } from './shopify.dto';
import { BaseController } from '../../core/BaseController';
import { Public } from '../../core/common/decorators/public.decorator';
import { ShopCodeGuard } from '../../core/common/guards/shop-code.guard';
import { ShopifyModule } from './shopify.module';
import { ShopInfo } from './entities/shop-info.entity';

@Controller('api/shopify')
export class ShopifyController extends BaseController {
  constructor(private readonly shopifyService: ShopifyService) {
    super();
  }

  @Public()
  @Post('installation')
  async startInstallation(@Body() authData: ShopifyAuthDto) {
    if (!authData.fingerprint) {
      throw new BadRequestException('Fingerprint is required');
    }
    try {
      // Save installation data to public.shopify_shops table
      const shopRecord =
        await this.shopifyService.saveInstallationData(authData);

      return this.responseJson(
        {
          shop_code: shopRecord.shop_code,
          shop: shopRecord.shop,
          installation_token: shopRecord.installation_token,
          status: shopRecord.status,
        },
        HttpStatus.OK,
        'Installation started successfully',
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error during installation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @UseGuards(ShopCodeGuard)
  @Post('authorize')
  async authorize(@Body() authData: ShopifyAuthDto, @Req() request: any) {
    try {

      // Validate timestamp (should not be older than 1 hour)
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(authData.timestamp);
      const timeDifference = currentTime - requestTime;

      if (timeDifference > 3600) {
        // 1 hour in seconds
        throw new BadRequestException('Request timestamp is too old');
      }

      // Validate HMAC
      const isValidHmac = await this.shopifyService.validateHmac(authData);
      if (!isValidHmac) {
        throw new UnauthorizedException('Invalid HMAC signature');
      }

      // Get shop from request (validated by ShopCodeGuard)
      const shop = request.shop;
      const shopCode = shop.shop_code;

      // Verify fingerprint matches installation_token
      if (authData.fingerprint && shop.fingerprint !== authData.fingerprint) {
        throw new UnauthorizedException(
          'Fingerprint mismatch - installation token invalid',
        );
      }

      // Process authorization
      const result = await this.shopifyService.processAuthorization(authData, shopCode);

      if (result && shopCode && result.status !== 'authorized') {
        await this.shopifyService.createDynamicSchemaByCode(shopCode);
      } else {
        throw new BadRequestException('Shop code is required');
      }

      // Update authorization status and record completion time
      const updatedShop =
        await this.shopifyService.updateAuthorizationStatus(shopCode);

      return this.responseJson(
        result,
        HttpStatus.OK,
        'Authorization successful',
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error during authorization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
