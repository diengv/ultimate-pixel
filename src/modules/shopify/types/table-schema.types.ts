export interface ColumnDefinition {
  name: string;
  type: string;
  length?: number;
  nullable?: boolean;
  default?: string | number | boolean;
  unique?: boolean;
  primaryKey?: boolean;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface TriggerDefinition {
  name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'BEFORE' | 'AFTER';
  function: string;
  condition?: string;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  triggers?: TriggerDefinition[];
  constraints?: string[];
}

export interface SchemaDefinition {
  name: string;
  tables: TableDefinition[];
  functions?: string[];
}

export enum ColumnType {
  SERIAL = 'SERIAL',
  INTEGER = 'INTEGER',
  BIGINT = 'BIGINT',
  VARCHAR = 'VARCHAR',
  TEXT = 'TEXT',
  BOOLEAN = 'BOOLEAN',
  TIMESTAMP = 'TIMESTAMP',
  DATE = 'DATE',
  JSONB = 'JSONB',
  DECIMAL = 'DECIMAL',
  UUID = 'UUID'
}

export interface TimestampColumns {
  created_at: ColumnDefinition;
  updated_at: ColumnDefinition;
  deleted_at: ColumnDefinition;
}