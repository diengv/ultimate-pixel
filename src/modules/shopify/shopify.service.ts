import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { ShopInfo } from './entities/shop-info.entity';
import { ShopifyAuthDto } from './shopify.dto';
import { SchemaBuilderUtil } from './utils/schema-builder.util';
import { DatabaseFunctionsUtil } from './utils/database-functions.util';
import {
  TABLE_REGISTRY,
  DEFAULT_SHOP_TABLES,
  TableName,
} from './configs/table-schemas.config';
import { ShopifyShop } from '../../core/entities/shopify-shop.entity';
import { EntityTarget } from 'typeorm/common/EntityTarget';

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
    this.clientSecret = this.configService.get<string>(
      'shopify.clientSecret',
      'your-client-secret',
    );
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

      if (authData.state) {
        queryParams.append('state', authData.state);
      }
      if (authData.code) {
        queryParams.append('code', authData.code);
      }

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

  private generateInstallationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  checkInstallationStatus(shopCode: string) {
    //todo call shopify api with graphql to check if shop is installed. https://shopify.dev/docs/api/admin-graphql/latest/queries/appInstallation
    return Promise.resolve(false);
  }

  async saveInstallationData(authData: ShopifyAuthDto): Promise<ShopifyShop> {
    try {
      const existingShop = await this.shopifyShopRepository.findOne({
        where: { shop: authData.shop },
      });

      if (existingShop) {
        if (await this.checkInstallationStatus(existingShop.shop_code)) {
          return existingShop;
        }

        // Check if fingerprint has changed (reinstallation scenario)
        const shouldRegenerateToken =
          !existingShop.fingerprint ||
          existingShop.fingerprint !== authData.fingerprint;

        // Update existing record
        existingShop.host = authData.host;
        existingShop.hmac = authData.hmac;
        existingShop.timestamp = authData.timestamp;
        existingShop.status = 'installing';
        existingShop.installation_started_at = new Date();
        existingShop.note = authData.note || '';
        existingShop.fingerprint = authData.fingerprint || '';

        // Regenerate installation_token if fingerprint changed or doesn't exist
        if (shouldRegenerateToken) {
          existingShop.installation_token = this.generateInstallationToken();
        }

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
          installation_token: this.generateInstallationToken(),
          note: authData.note,
          fingerprint: authData.fingerprint,
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

  async createDynamicSchema(
    shopCode: string,
    tableNames?: TableName[],
  ): Promise<void> {
    try {
      const schemaName = `shopify_${shopCode}`;
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

  async createDynamicSchemaByCode(
    shopCode: string,
    tableNames?: TableName[],
  ): Promise<void> {
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
  getRepositoryForShop(entityClass: EntityTarget<any>, shopCode: string) {
    const schemaName = `shop_${shopCode}`;


    return this.dataSource.getRepository(ShopInfo)
  }

  /**
   * Load entities from shop-specific schema
   */
  async loadEntitiesFromShopSchema<T>(
    entityClass: any,
    shopCode: string,
    options?: any,
  ): Promise<T[]> {
    const schemaName = `shop_${shopCode}`;
    try {
      const queryBuilder = this.dataSource
        .createQueryBuilder()
        .select('*')
        .from(
          `${schemaName}.${entityClass.name.toLowerCase()}`,
          entityClass.name.toLowerCase(),
        );

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
  async addTableToShopSchema(
    shopCode: string,
    tableName: TableName,
  ): Promise<void> {
    try {
      const schemaName = `shopify_${shopCode}`;

      // Check if schema exists
      const schemaExists = await this.schemaBuilder.schemaExists(schemaName);
      if (!schemaExists) {
        throw new Error(`Schema ${schemaName} does not exist`);
      }

      // Check if table already exists
      const tableExists = await this.schemaBuilder.tableExists(
        tableName,
        schemaName,
      );
      if (tableExists) {
        console.log(
          `Table ${tableName} already exists in schema ${schemaName}`,
        );
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
  async addTablesToShopSchema(
    shopCode: string,
    tableNames: TableName[],
  ): Promise<void> {
    for (const tableName of tableNames) {
      await this.addTableToShopSchema(shopCode, tableName);
    }
  }

  async processAuthorization(
    authData: ShopifyAuthDto,
    shopCode: string,
  ): Promise<any> {
    try {
      this.logAuthorizationStart(authData.shop); // Step 1

      const { clientId, clientSecret } = this.validateConfig(); // Step 1

      if (!authData.code) {
        return this.handleRedirectForAuthorization(
          authData,
          clientId,
          shopCode,
        ); // Step 2
      }

      const accessToken = await this.fetchAccessToken(
        authData,
        clientId,
        clientSecret,
      ); // Step 3

      await this.saveAccessTokenToSchema(shopCode, accessToken); // Step 4

      return this.createSuccessResponse(shopCode, accessToken); // Step 5
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
  private handleRedirectForAuthorization(
    authData: ShopifyAuthDto,
    clientId: string,
    shopCode: string,
  ) {
    const scopes = 'read_products,write_products,read_orders,write_orders';
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${this.configService.get<string>('shopify.clientUrl', 'http://localhost:5173')}/authorize`;

    const authUrl =
      `https://${authData.shop}/admin/oauth/authorize?` +
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
  private async fetchAccessToken(
    authData: ShopifyAuthDto,
    clientId: string,
    clientSecret: string,
  ) {
    const tokenResponse = await fetch(
      `https://${authData.shop}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: authData.code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error(
        `Failed to get access token: ${tokenResponse.statusText}`,
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received from Shopify');
    }

    return accessToken;
  }

  // Step 4: Save Access Token to Schema
  private async saveAccessTokenToSchema(shopCode: string, accessToken: string) {
    const shopRecord = await this.shopifyShopRepository.findOne({
      where: { shop_code: shopCode },
    });

    if (!shopRecord) {
      throw new Error('Shop record not found');
    }

    const schemaName = `shopify_${shopRecord.shop_code}`;
    const shopInfoRepo = this.getRepositoryForShop(
      ShopInfo,
      shopRecord.shop_code,
    );
    await shopInfoRepo.upsert(
      {
        shop_code: shopCode,
        shop_domain: shopRecord.shop,
        access_token: accessToken,
      },
      { conflictPaths: ['shop_code'] },
    );

    console.log(
      `Access token saved for shop: ${shopRecord.shop} in schema: ${schemaName}`,
    );
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
