import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import type { ShopifyAuthDto } from './shopify.dto';
import { BaseController } from '../../core/BaseController';

@Controller('api/shopify')
export class ShopifyController extends BaseController {
  constructor(private readonly shopifyService: ShopifyService) {
    super();
  }

  @Post('installation')
  async startInstallation(
    @Body() authData: ShopifyAuthDto,
    @Headers('shop_code') shopCode?: string
  ) {
    try {
      // Validate required fields
      if (
        !authData.hmac ||
        !authData.host ||
        !authData.shop ||
        !authData.timestamp
      ) {
        throw new HttpException(
          'Missing required parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save installation data to public.shopify_shops table
      const shopRecord =
        await this.shopifyService.saveInstallationData(authData);

      // If shop_code is provided in headers, create schema immediately
      if (shopCode) {
        await this.shopifyService.createDynamicSchemaByCode(shopCode);
      }

      return this.responseJson(
        shopRecord,
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

  @Post('authorize')
  async authorize(@Body() authData: ShopifyAuthDto) {
    try {
      // Validate required fields
      if (
        !authData.hmac ||
        !authData.host ||
        !authData.shop ||
        !authData.timestamp
      ) {
        throw new HttpException(
          'Missing required parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate shop domain format
      if (!authData.shop.includes('.myshopify.com')) {
        throw new HttpException(
          'Invalid shop domain format',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate timestamp (should not be older than 1 hour)
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(authData.timestamp);
      const timeDifference = currentTime - requestTime;

      if (timeDifference > 3600) {
        // 1 hour in seconds
        throw new HttpException(
          'Request timestamp is too old',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate HMAC
      const isValidHmac = await this.shopifyService.validateHmac(authData);
      if (!isValidHmac) {
        throw new HttpException(
          'Invalid HMAC signature',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Process authorization
      const result = await this.shopifyService.processAuthorization(authData);

      // Find the shop record to get the ID
      const shopRecord =
        await this.shopifyService.saveInstallationData(authData);

      // Update authorization status and record completion time
      const updatedShop = await this.shopifyService.updateAuthorizationStatus(
        shopRecord.shop_code,
      );

      // Create dynamic schema shopify_<shop_id> and shop_info table
      await this.shopifyService.createDynamicSchema(shopRecord.shop_code);

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
