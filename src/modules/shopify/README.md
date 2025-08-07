# Shopify Dynamic Schema Architecture

## Overview

This module implements a scalable and maintainable architecture for creating dynamic database schemas for Shopify shops. The system is designed to easily support multiple table types and future expansion without requiring code changes to the core logic.

## Architecture Components

### 1. Type Definitions (`types/table-schema.types.ts`)

Defines the structure for table schemas:

```typescript
interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  triggers?: TriggerDefinition[];
  constraints?: string[];
}
```

### 2. Table Configurations (`configs/table-schemas.config.ts`)

Contains predefined table schemas:

- **SHOP_INFO_TABLE**: Basic shop information
- **PRODUCTS_TABLE**: Shopify products data
- **ORDERS_TABLE**: Shopify orders data
- **TABLE_REGISTRY**: Central registry of all available tables
- **DEFAULT_SHOP_TABLES**: Tables created by default for new shops

### 3. Schema Builder Utility (`utils/schema-builder.util.ts`)

Provides methods for:
- Generating SQL from table definitions
- Creating tables, indexes, and triggers
- Managing schemas and validating existence

### 4. Database Functions Utility (`utils/database-functions.util.ts`)

Manages PostgreSQL functions:
- Creates standard trigger functions
- Checks function existence
- Manages database function lifecycle

### 5. Schema Management Service (`services/schema-management.service.ts`)

Advanced features for:
- Schema versioning and tracking
- Schema migrations
- Schema validation and integrity checks
- Runtime table registration

## Usage Guide

### Creating a Basic Shop Schema

```typescript
// Create schema with default tables (shop_info)
await shopifyService.createDynamicSchema(shopId);

// Create schema with specific tables
await shopifyService.createDynamicSchema(shopId, ['shop_info', 'products']);
```

### Adding Tables to Existing Schema

```typescript
// Add single table
await shopifyService.addTableToShopSchema(shopId, 'products');

// Add multiple tables
await shopifyService.addTablesToShopSchema(shopId, ['products', 'orders']);
```

### Adding New Table Types

1. **Define the table in `configs/table-schemas.config.ts`:**

```typescript
export const CUSTOMERS_TABLE: TableDefinition = {
  name: 'customers',
  columns: [
    {
      name: 'id',
      type: ColumnType.SERIAL,
      primaryKey: true
    },
    {
      name: 'shopify_customer_id',
      type: ColumnType.BIGINT,
      nullable: false,
      unique: true
    },
    {
      name: 'email',
      type: ColumnType.VARCHAR,
      length: 255,
      nullable: false
    },
    // ... more columns
    STANDARD_TIMESTAMP_COLUMNS.created_at,
    STANDARD_TIMESTAMP_COLUMNS.updated_at,
    STANDARD_TIMESTAMP_COLUMNS.deleted_at
  ],
  indexes: [
    {
      name: 'idx_customers_shopify_id',
      columns: ['shopify_customer_id'],
      unique: true
    }
  ],
  triggers: [UPDATED_AT_TRIGGER]
};
```

2. **Add to TABLE_REGISTRY:**

```typescript
export const TABLE_REGISTRY = {
  shop_info: SHOP_INFO_TABLE,
  products: PRODUCTS_TABLE,
  orders: ORDERS_TABLE,
  customers: CUSTOMERS_TABLE, // Add new table
} as const;
```

3. **Use immediately:**

```typescript
await shopifyService.addTableToShopSchema(shopId, 'customers');
```

### Schema Migrations

```typescript
const migration: SchemaMigration = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  addTables: ['customers', 'inventory'],
  removeTables: ['deprecated_table']
};

await schemaManagementService.migrateSchema(shopId, migration);
```

### Schema Validation

```typescript
const validation = await schemaManagementService.validateSchema(shopId);
if (!validation.isValid) {
  console.log('Missing tables:', validation.missingTables);
  console.log('Extra tables:', validation.extraTables);
}
```

## Key Benefits

### 1. **Maintainability**
- Table definitions are centralized in configuration files
- No hardcoded SQL in business logic
- Easy to modify table structures

### 2. **Scalability**
- Support for unlimited table types
- Runtime table addition
- Schema versioning and migrations

### 3. **Consistency**
- Standardized timestamp tracking across all tables
- Consistent naming conventions
- Reusable components (triggers, indexes)

### 4. **Flexibility**
- Create schemas with different table combinations
- Add tables to existing schemas
- Support for custom table definitions

### 5. **Reliability**
- Schema validation and integrity checks
- Migration tracking and rollback capabilities
- Error handling and logging

## File Structure

```
src/modules/shopify/
├── configs/
│   └── table-schemas.config.ts     # Table definitions
├── services/
│   └── schema-management.service.ts # Advanced schema management
├── types/
│   └── table-schema.types.ts       # Type definitions
├── utils/
│   ├── schema-builder.util.ts      # Core schema building
│   └── database-functions.util.ts  # Database function management
├── shopify.service.ts              # Main service with refactored methods
└── README.md                       # This documentation
```

## Migration from Old System

The old `createDynamicSchema` method has been completely refactored:

**Before (Hardcoded):**
```typescript
// Hardcoded SQL for single table
await this.dataSource.query(`CREATE TABLE...`);
```

**After (Configuration-based):**
```typescript
// Configuration-based, multiple tables supported
await this.createDynamicSchema(shopId, ['shop_info', 'products']);
```

## Testing

Run the architecture test:

```bash
node test-schema-architecture.js
```

This will verify:
- Configuration-based table creation
- Schema builder utilities
- Table registry system
- Dynamic schema creation
- Extensibility features

## Future Development

### Adding New Features

1. **New Table Type**: Add to `table-schemas.config.ts`
2. **New Column Type**: Add to `ColumnType` enum
3. **New Index Type**: Add to `IndexDefinition` interface
4. **Custom Triggers**: Define in table configuration

### Best Practices

1. **Always use timestamp columns**: Include `STANDARD_TIMESTAMP_COLUMNS`
2. **Add indexes for foreign keys**: Improve query performance
3. **Use meaningful names**: Follow naming conventions
4. **Document changes**: Update schema versions
5. **Test migrations**: Validate before production deployment

## Troubleshooting

### Common Issues

1. **Table creation fails**: Check table definition syntax
2. **Trigger errors**: Ensure database functions exist
3. **Schema validation fails**: Check table registry consistency
4. **Migration errors**: Verify migration definition

### Debug Mode

Enable detailed logging by setting environment variable:
```bash
NODE_ENV=development
```

This will show detailed SQL queries and execution steps.

## Performance Considerations

- **Indexes**: Automatically created based on table definitions
- **Triggers**: Only created when needed (updated_at)
- **Schema validation**: Cached results for better performance
- **Batch operations**: Multiple tables created in single transaction

## Security

- **SQL Injection**: All queries use parameterized statements
- **Schema isolation**: Each shop has separate schema
- **Access control**: Schema-level permissions
- **Audit trail**: All changes tracked in schema_info table