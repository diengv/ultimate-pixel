import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { ShopInfo } from './entities/shop-info.entity';
import { ShopifyAuthDto } from './shopify.dto';
import { SchemaBuilderUtil } from './utils/schema-builder.util';
import { DatabaseFunctionsUtil } from './utils/database-functions.util';
import { TABLE_REGISTRY, DEFAULT_SHOP_TABLES, TableName } from './configs/table-schemas.config';
import { ShopifyShop } from '../../core/entities/shopify-shop.entity';

@Injectable()
export class ShopifyService {
  private readonly clientSecret: string;
  private readonly schemaBuilder: SchemaBuilderUtil;
  private readonly dbFunctions: DatabaseFunctionsUtil;

  constructor(
    @InjectRepository(ShopifyShop)
    private shopifyShopRepository: Repository<ShopifyShop>,
    @InjectRepository(ShopInfo)
    private shopInfoRepository: Repository<ShopInfo>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    this.clientSecret = this.configService.get<string>('shopify.clientSecret', 'your-client-secret');
    this.schemaBuilder = new SchemaBuilderUtil(this.dataSource);
    this.dbFunctions = new DatabaseFunctionsUtil(this.dataSource);
  }

  async validateHmac(authData: ShopifyAuthDto): Promise<boolean> {
    try {
      // Create query string without hmac for validation
      const queryParams = new URLSearchParams();
      queryParams.append('host', authData.host);
      queryParams.append('shop', authData.shop);
      queryParams.append('timestamp', authData.timestamp);

      // Sort parameters alphabetically
      queryParams.sort();
      const queryString = queryParams.toString();

      // Generate HMAC
      const generatedHmac = crypto
        .createHmac('sha256', this.clientSecret)
        .update(queryString)
        .digest('hex');

      // Compare with provided HMAC
      return crypto.timingSafeEqual(
        Buffer.from(generatedHmac, 'hex'),
        Buffer.from(authData.hmac, 'hex'),
      );
    } catch (error) {
      console.error('HMAC validation error:', error);
      return false;
    }
  }

  async saveInstallationData(authData: ShopifyAuthDto): Promise<ShopifyShop> {
    try {
      const existingShop = await this.shopifyShopRepository.findOne({
        where: { shop: authData.shop },
      });

      if (existingShop) {
        // Update existing record
        existingShop.host = authData.host;
        existingShop.hmac = authData.hmac;
        existingShop.timestamp = authData.timestamp;
        existingShop.status = 'installing';
        existingShop.installation_started_at = new Date();
        return await this.shopifyShopRepository.save(existingShop);
      } else {
        // Create new record
        const newShop = this.shopifyShopRepository.create({
          shop: authData.shop,
          host: authData.host,
          hmac: authData.hmac,
          timestamp: authData.timestamp,
          status: 'installing',
          installation_started_at: new Date(),
        });
        return await this.shopifyShopRepository.save(newShop);
      }
    } catch (error) {
      console.error('Error saving installation data:', error);
      throw new Error('Failed to save installation data');
    }
  }

  async updateAuthorizationStatus(shopCode: string): Promise<ShopifyShop> {
    try {
      const shop = await this.shopifyShopRepository.findOne({
        where: { shop_code: shopCode },
      });

      if (!shop) {
        throw new Error('Shop not found');
      }

      shop.status = 'authorized';
      shop.authorization_completed_at = new Date();
      return await this.shopifyShopRepository.save(shop);
    } catch (error) {
      console.error('Error updating authorization status:', error);
      throw new Error('Failed to update authorization status');
    }
  }

  async createDynamicSchema(shopId: number, tableNames?: TableName[]): Promise<void> {
    try {
      const schemaName = `shopify_${shopId}`;
      const tablesToCreate = tableNames || DEFAULT_SHOP_TABLES;
      
      // Create schema
      await this.schemaBuilder.createSchema(schemaName);
      
      // Create tables from configuration
      for (const tableName of tablesToCreate) {
        const tableDefinition = TABLE_REGISTRY[tableName];
        if (tableDefinition) {
          await this.schemaBuilder.createTable(tableDefinition, schemaName);
          console.log(`Created table: ${schemaName}.${tableName}`);
        } else {
          console.warn(`Table definition not found for: ${tableName}`);
        }
      }

    } catch (error) {
      console.error('Error creating dynamic schema:', error);
      throw new Error('Failed to create dynamic schema');
    }
  }

  async createDynamicSchemaByCode(shopCode: string, tableNames?: TableName[]): Promise<void> {
    try {
      const schemaName = `shop_${shopCode}`;
      const tablesToCreate = tableNames || DEFAULT_SHOP_TABLES;
      
      // Create schema
      await this.schemaBuilder.createSchema(schemaName);
      
      // Create tables from configuration
      for (const tableName of tablesToCreate) {
        const tableDefinition = TABLE_REGISTRY[tableName];
        if (tableDefinition) {
          await this.schemaBuilder.createTable(tableDefinition, schemaName);
          console.log(`Created table: ${schemaName}.${tableName}`);
        } else {
          console.warn(`Table definition not found for: ${tableName}`);
        }
      }

    } catch (error) {
      console.error('Error creating dynamic schema by code:', error);
      throw new Error('Failed to create dynamic schema by code');
    }
  }

  /**
   * Get repository for entity in specific shop schema
   */
  getRepositoryForShop<T>(entityClass: any, shopCode: string): Repository<T> {
    const schemaName = `shop_${shopCode}`;
    return this.dataSource.getRepository(entityClass).extend({
      metadata: {
        ...this.dataSource.getRepository(entityClass).metadata,
        schema: schemaName
      }
    });
  }

  /**
   * Load entities from shop-specific schema
   */
  async loadEntitiesFromShopSchema<T>(entityClass: any, shopCode: string, options?: any): Promise<T[]> {
    const schemaName = `shop_${shopCode}`;
    try {
      const queryBuilder = this.dataSource
        .createQueryBuilder()
        .select('*')
        .from(`${schemaName}.${entityClass.name.toLowerCase()}`, entityClass.name.toLowerCase());
      
      if (options?.where) {
        queryBuilder.where(options.where);
      }
      
      return await queryBuilder.getRawMany();
    } catch (error) {
      console.error(`Error loading entities from schema ${schemaName}:`, error);
      throw new Error(`Failed to load entities from shop schema`);
    }
  }

  /**
   * Add new table to existing shop schema
   */
  async addTableToShopSchema(shopId: number, tableName: TableName): Promise<void> {
    try {
      const schemaName = `shopify_${shopId}`;
      
      // Check if schema exists
      const schemaExists = await this.schemaBuilder.schemaExists(schemaName);
      if (!schemaExists) {
        throw new Error(`Schema ${schemaName} does not exist`);
      }
      
      // Check if table already exists
      const tableExists = await this.schemaBuilder.tableExists(tableName, schemaName);
      if (tableExists) {
        console.log(`Table ${tableName} already exists in schema ${schemaName}`);
        return;
      }
      
      // Create the table
      const tableDefinition = TABLE_REGISTRY[tableName];
      if (tableDefinition) {
        await this.schemaBuilder.createTable(tableDefinition, schemaName);
        console.log(`Added table: ${schemaName}.${tableName}`);
      } else {
        throw new Error(`Table definition not found for: ${tableName}`);
      }

    } catch (error) {
      console.error('Error adding table to shop schema:', error);
      throw new Error('Failed to add table to shop schema');
    }
  }

  /**
   * Create multiple tables in shop schema
   */
  async addTablesToShopSchema(shopId: number, tableNames: TableName[]): Promise<void> {
    for (const tableName of tableNames) {
      await this.addTableToShopSchema(shopId, tableName);
    }
  }

  async processAuthorization(authData: ShopifyAuthDto): Promise<any> {
    try {
      this.logAuthorizationStart(authData.shop); // Step 1

      const { clientId, clientSecret } = this.validateConfig(); // Step 1

      if (!authData.code) {
        return this.handleRedirectForAuthorization(authData, clientId); // Step 2
      }

      const accessToken = await this.fetchAccessToken(authData, clientId, clientSecret); // Step 3

      await this.saveAccessTokenToSchema(authData.shop, accessToken); // Step 4

      return this.createSuccessResponse(authData.shop, accessToken); // Step 5

    } catch (error) {
      console.error('Authorization processing error:', error);
      throw new Error('Failed to process authorization');
    }
  }

// Step 1: Log and Validate Configuration
  private logAuthorizationStart(shop: string) {
    console.log('Processing authorization for shop:', shop);
  }

  private validateConfig() {
    const clientId = this.configService.get<string>('shopify.clientID');
    const clientSecret = this.configService.get<string>('shopify.clientSecret');

    if (!clientId || !clientSecret) {
      throw new Error('Shopify client credentials not configured');
    }

    return { clientId, clientSecret };
  }

// Step 2: Handle Redirect for Authorization
  private handleRedirectForAuthorization(authData: ShopifyAuthDto, clientId: string) {
    const scopes = 'read_products,write_products,read_orders,write_orders';
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${this.configService.get<string>('shopify.clientUrl', 'http://localhost:5173')}/authorize`;

    const authUrl = `https://${authData.shop}/admin/oauth/authorize?` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    return {
      shopDomain: authData.shop,
      status: 'redirect_required',
      authUrl: authUrl,
      state: state,
    };
  }

// Step 3: Fetch Access Token
  private async fetchAccessToken(authData: ShopifyAuthDto, clientId: string, clientSecret: string) {
    const tokenResponse = await fetch(`https://${authData.shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: authData.code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received from Shopify');
    }

    return accessToken;
  }

// Step 4: Save Access Token to Schema
  private async saveAccessTokenToSchema(shop: string, accessToken: string) {
    const shopRecord = await this.shopifyShopRepository.findOne({
      where: { shop },
    });

    if (!shopRecord) {
      throw new Error('Shop record not found');
    }

    const schemaName = `shopify_${shopRecord.shop_code}`;
    await this.dataSource.query(
      `INSERT INTO ${schemaName}.shop_info (shop_domain, access_token, created_at, updated_at) 
     VALUES ($1, $2, NOW(), NOW()) 
     ON CONFLICT (shop_domain) 
     DO UPDATE SET access_token = $2, updated_at = NOW()`,
      [shop, accessToken],
    );

    console.log(`Access token saved for shop: ${shop} in schema: ${schemaName}`);
  }

// Step 5: Create Success Response
  private createSuccessResponse(shop: string, accessToken: string) {
    return {
      shopDomain: shop,
      authorizedAt: new Date().toISOString(),
      status: 'authorized',
      accessToken: accessToken,
      redirectUrl: `${this.configService.get<string>('app.frontendUrl', 'http://localhost:3001')}/dashboard?shop=${shop}`,
    };
  }
}