import { 
  TableDefinition, 
  ColumnDefinition, 
  ColumnType, 
  TimestampColumns,
  TriggerDefinition 
} from '../types/table-schema.types';

// Standard timestamp columns for all tables
export const STANDARD_TIMESTAMP_COLUMNS: TimestampColumns = {
  created_at: {
    name: 'created_at',
    type: ColumnType.TIMESTAMP,
    default: 'CURRENT_TIMESTAMP',
    nullable: false
  },
  updated_at: {
    name: 'updated_at',
    type: ColumnType.TIMESTAMP,
    default: 'CURRENT_TIMESTAMP',
    nullable: false
  },
  deleted_at: {
    name: 'deleted_at',
    type: ColumnType.TIMESTAMP,
    nullable: true
  }
};

// Standard updated_at trigger
export const UPDATED_AT_TRIGGER: TriggerDefinition = {
  name: 'update_updated_at',
  event: 'UPDATE',
  timing: 'BEFORE',
  function: 'update_updated_at_column()'
};

// Shop Info table definition
export const SHOP_INFO_TABLE: TableDefinition = {
  name: 'shop_info',
  columns: [
    {
      name: 'id',
      type: ColumnType.SERIAL,
      primaryKey: true
    },
    {
      name: 'shop_domain',
      type: ColumnType.VARCHAR,
      length: 255,
      nullable: false
    },
    {
      name: 'shop_name',
      type: ColumnType.VARCHAR,
      length: 255,
      nullable: true
    },
    {
      name: 'shop_email',
      type: ColumnType.VARCHAR,
      length: 100,
      nullable: true
    },
    {
      name: 'currency',
      type: ColumnType.VARCHAR,
      length: 50,
      nullable: true
    },
    {
      name: 'timezone',
      type: ColumnType.VARCHAR,
      length: 100,
      nullable: true
    },
    {
      name: 'plan_name',
      type: ColumnType.VARCHAR,
      length: 50,
      nullable: true
    },
    {
      name: 'is_active',
      type: ColumnType.BOOLEAN,
      default: true,
      nullable: false
    },
    {
      name: 'additional_data',
      type: ColumnType.JSONB,
      nullable: true
    },
    STANDARD_TIMESTAMP_COLUMNS.created_at,
    STANDARD_TIMESTAMP_COLUMNS.updated_at,
    STANDARD_TIMESTAMP_COLUMNS.deleted_at
  ],
  triggers: [UPDATED_AT_TRIGGER]
};

// Product table definition (example for future expansion)
export const PRODUCTS_TABLE: TableDefinition = {
  name: 'products',
  columns: [
    {
      name: 'id',
      type: ColumnType.SERIAL,
      primaryKey: true
    },
    {
      name: 'shopify_product_id',
      type: ColumnType.BIGINT,
      nullable: false,
      unique: true
    },
    {
      name: 'title',
      type: ColumnType.VARCHAR,
      length: 500,
      nullable: false
    },
    {
      name: 'handle',
      type: ColumnType.VARCHAR,
      length: 255,
      nullable: false
    },
    {
      name: 'description',
      type: ColumnType.TEXT,
      nullable: true
    },
    {
      name: 'vendor',
      type: ColumnType.VARCHAR,
      length: 255,
      nullable: true
    },
    {
      name: 'product_type',
      type: ColumnType.VARCHAR,
      length: 255,
      nullable: true
    },
    {
      name: 'status',
      type: ColumnType.VARCHAR,
      length: 50,
      default: 'active',
      nullable: false
    },
    {
      name: 'tags',
      type: ColumnType.TEXT,
      nullable: true
    },
    {
      name: 'price',
      type: ColumnType.DECIMAL,
      nullable: true
    },
    {
      name: 'compare_at_price',
      type: ColumnType.DECIMAL,
      nullable: true
    },
    {
      name: 'inventory_quantity',
      type: ColumnType.INTEGER,
      default: 0,
      nullable: false
    },
    {
      name: 'published_at',
      type: ColumnType.TIMESTAMP,
      nullable: true
    },
    STANDARD_TIMESTAMP_COLUMNS.created_at,
    STANDARD_TIMESTAMP_COLUMNS.updated_at,
    STANDARD_TIMESTAMP_COLUMNS.deleted_at
  ],
  indexes: [
    {
      name: 'idx_products_shopify_id',
      columns: ['shopify_product_id'],
      unique: true
    },
    {
      name: 'idx_products_handle',
      columns: ['handle']
    },
    {
      name: 'idx_products_status',
      columns: ['status']
    }
  ],
  triggers: [UPDATED_AT_TRIGGER]
};

// Order table definition (example for future expansion)
export const ORDERS_TABLE: TableDefinition = {
  name: 'orders',
  columns: [
    {
      name: 'id',
      type: ColumnType.SERIAL,
      primaryKey: true
    },
    {
      name: 'shopify_order_id',
      type: ColumnType.BIGINT,
      nullable: false,
      unique: true
    },
    {
      name: 'order_number',
      type: ColumnType.VARCHAR,
      length: 50,
      nullable: false
    },
    {
      name: 'email',
      type: ColumnType.VARCHAR,
      length: 255,
      nullable: true
    },
    {
      name: 'total_price',
      type: ColumnType.DECIMAL,
      nullable: false
    },
    {
      name: 'subtotal_price',
      type: ColumnType.DECIMAL,
      nullable: false
    },
    {
      name: 'total_tax',
      type: ColumnType.DECIMAL,
      nullable: true
    },
    {
      name: 'currency',
      type: ColumnType.VARCHAR,
      length: 10,
      nullable: false
    },
    {
      name: 'financial_status',
      type: ColumnType.VARCHAR,
      length: 50,
      nullable: true
    },
    {
      name: 'fulfillment_status',
      type: ColumnType.VARCHAR,
      length: 50,
      nullable: true
    },
    {
      name: 'processed_at',
      type: ColumnType.TIMESTAMP,
      nullable: true
    },
    STANDARD_TIMESTAMP_COLUMNS.created_at,
    STANDARD_TIMESTAMP_COLUMNS.updated_at,
    STANDARD_TIMESTAMP_COLUMNS.deleted_at
  ],
  indexes: [
    {
      name: 'idx_orders_shopify_id',
      columns: ['shopify_order_id'],
      unique: true
    },
    {
      name: 'idx_orders_number',
      columns: ['order_number']
    },
    {
      name: 'idx_orders_email',
      columns: ['email']
    },
    {
      name: 'idx_orders_status',
      columns: ['financial_status', 'fulfillment_status']
    }
  ],
  triggers: [UPDATED_AT_TRIGGER]
};

// Registry of all available tables
export const TABLE_REGISTRY = {
  shop_info: SHOP_INFO_TABLE,
  products: PRODUCTS_TABLE,
  orders: ORDERS_TABLE
} as const;

// Default tables to create for new shops
export const DEFAULT_SHOP_TABLES = [
  'shop_info'
] as const;

// All available table names
export type TableName = keyof typeof TABLE_REGISTRY;