import { IsNotEmpty, IsOptional, IsString, Matches, IsNumberString } from 'class-validator';

export class ShopifyAuthDto {
  @IsString()
  @IsNotEmpty()
  hmac: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[\w][\w-]*\.myshopify\.com$/i, {
    message: 'shop must be a valid .myshopify.com domain',
  })
  shop: string;

  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  timestamp: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  code?: string; // Authorization code from Shopify

  @IsOptional()
  @IsString()
  state?: string; // State parameter for security

  @IsOptional()
  @IsString()
  scope?: string; // Requested scopes

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{32}$/i, {
    message: 'fingerprint invalid',
  })
  fingerprint?: string;
}