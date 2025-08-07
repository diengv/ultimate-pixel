import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchemaBuilderUtil } from '../utils/schema-builder.util';
import { DatabaseFunctionsUtil } from '../utils/database-functions.util';
import { TABLE_REGISTRY, TableName } from '../configs/table-schemas.config';
import { TableDefinition } from '../types/table-schema.types';

export interface SchemaVersion {
  version: string;
  description: string;
  tables: TableName[];
  createdAt: Date;
}

export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  addTables?: TableName[];
  removeTables?: TableName[];
  modifyTables?: {
    tableName: TableName;
    changes: string[];
  }[];
}

@Injectable()
export class SchemaManagementService {
  private readonly schemaBuilder: SchemaBuilderUtil;
  private readonly dbFunctions: DatabaseFunctionsUtil;

  constructor(private dataSource: DataSource) {
    this.schemaBuilder = new SchemaBuilderUtil(this.dataSource);
    this.dbFunctions = new DatabaseFunctionsUtil(this.dataSource);
  }

  /**
   * Get all available table definitions
   */
  getAvailableTables(): Record<string, TableDefinition> {
    return TABLE_REGISTRY;
  }

  /**
   * Get table definition by name
   */
  getTableDefinition(tableName: TableName): TableDefinition | undefined {
    return TABLE_REGISTRY[tableName];
  }

  /**
   * Register a new table definition (for runtime registration)
   */
  registerTable(tableName: string, tableDefinition: TableDefinition): void {
    // This would extend the registry at runtime
    // Implementation depends on how you want to handle dynamic registration
    console.log(`Registering new table: ${tableName}`);
  }

  /**
   * Get current schema version for a shop
   */
  async getSchemaVersion(shopId: number): Promise<SchemaVersion | null> {
    try {
      const schemaName = `shopify_${shopId}`;
      
      // Check if schema_info table exists
      const schemaInfoExists = await this.schemaBuilder.tableExists('schema_info', schemaName);
      if (!schemaInfoExists) {
        return null;
      }

      const result = await this.dataSource.query(`
        SELECT version, description, tables, created_at
        FROM "${schemaName}".schema_info
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (result.length === 0) {
        return null;
      }

      return {
        version: result[0].version,
        description: result[0].description,
        tables: result[0].tables,
        createdAt: result[0].created_at
      };
    } catch (error) {
      console.error('Error getting schema version:', error);
      return null;
    }
  }

  /**
   * Create schema_info table to track schema versions
   */
  async createSchemaInfoTable(shopId: number): Promise<void> {
    const schemaName = `shopify_${shopId}`;
    
    const schemaInfoTable: TableDefinition = {
      name: 'schema_info',
      columns: [
        {
          name: 'id',
          type: 'SERIAL',
          primaryKey: true
        },
        {
          name: 'version',
          type: 'VARCHAR',
          length: 50,
          nullable: false
        },
        {
          name: 'description',
          type: 'TEXT',
          nullable: true
        },
        {
          name: 'tables',
          type: 'JSONB',
          nullable: false
        },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          default: 'CURRENT_TIMESTAMP',
          nullable: false
        }
      ]
    };

    await this.schemaBuilder.createTable(schemaInfoTable, schemaName);
  }

  /**
   * Record schema version
   */
  async recordSchemaVersion(
    shopId: number, 
    version: string, 
    description: string, 
    tables: TableName[]
  ): Promise<void> {
    const schemaName = `shopify_${shopId}`;
    
    // Ensure schema_info table exists
    const schemaInfoExists = await this.schemaBuilder.tableExists('schema_info', schemaName);
    if (!schemaInfoExists) {
      await this.createSchemaInfoTable(shopId);
    }

    await this.dataSource.query(`
      INSERT INTO "${schemaName}".schema_info (version, description, tables)
      VALUES ($1, $2, $3)
    `, [version, description, JSON.stringify(tables)]);
  }

  /**
   * Get all tables in a schema
   */
  async getSchemaTableList(shopId: number): Promise<string[]> {
    const schemaName = `shopify_${shopId}`;
    
    const result = await this.dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);

    return result.map((row: any) => row.table_name);
  }

  /**
   * Migrate schema to new version
   */
  async migrateSchema(shopId: number, migration: SchemaMigration): Promise<void> {
    const schemaName = `shopify_${shopId}`;
    
    try {
      // Add new tables
      if (migration.addTables && migration.addTables.length > 0) {
        for (const tableName of migration.addTables) {
          const tableDefinition = TABLE_REGISTRY[tableName];
          if (tableDefinition) {
            await this.schemaBuilder.createTable(tableDefinition, schemaName);
            console.log(`Added table: ${schemaName}.${tableName}`);
          }
        }
      }

      // Remove tables (with caution)
      if (migration.removeTables && migration.removeTables.length > 0) {
        for (const tableName of migration.removeTables) {
          await this.schemaBuilder.dropTable(tableName, schemaName);
          console.log(`Removed table: ${schemaName}.${tableName}`);
        }
      }

      // Modify tables (this would need more specific implementation)
      if (migration.modifyTables && migration.modifyTables.length > 0) {
        for (const modification of migration.modifyTables) {
          console.log(`Modifying table: ${schemaName}.${modification.tableName}`);
          // Implementation for table modifications would go here
        }
      }

      // Record the migration
      const currentTables = await this.getSchemaTableList(shopId);
      await this.recordSchemaVersion(
        shopId,
        migration.toVersion,
        `Migration from ${migration.fromVersion} to ${migration.toVersion}`,
        currentTables as TableName[]
      );

    } catch (error) {
      console.error('Error during schema migration:', error);
      throw new Error('Schema migration failed');
    }
  }

  /**
   * Validate schema integrity
   */
  async validateSchema(shopId: number): Promise<{
    isValid: boolean;
    missingTables: string[];
    extraTables: string[];
  }> {
    const schemaName = `shopify_${shopId}`;
    const currentVersion = await this.getSchemaVersion(shopId);
    
    if (!currentVersion) {
      return {
        isValid: false,
        missingTables: [],
        extraTables: []
      };
    }

    const actualTables = await this.getSchemaTableList(shopId);
    const expectedTables = currentVersion.tables;

    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    const extraTables = actualTables.filter(table => 
      !expectedTables.includes(table as TableName) && table !== 'schema_info'
    );

    return {
      isValid: missingTables.length === 0 && extraTables.length === 0,
      missingTables,
      extraTables
    };
  }
}