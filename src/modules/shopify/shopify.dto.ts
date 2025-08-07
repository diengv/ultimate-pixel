export interface ShopifyAuthDto {
  hmac: string;
  host: string;
  shop: string;
  timestamp: string;
  code?: string; // Authorization code from Shopify
  state?: string; // State parameter for security
  scope?: string; // Requested scopes
}