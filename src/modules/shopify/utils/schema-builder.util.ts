import { DataSource } from 'typeorm';
import { 
  TableDefinition, 
  ColumnDefinition, 
  IndexDefinition, 
  TriggerDefinition,
  SchemaDefinition 
} from '../types/table-schema.types';

export class SchemaBuilderUtil {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate CREATE TABLE SQL from table definition
   */
  generateCreateTableSQL(tableName: string, tableDefinition: TableDefinition, schemaName?: string): string {
    const fullTableName = schemaName ? `"${schemaName}"."${tableName}"` : `"${tableName}"`;
    
    const columns = tableDefinition.columns.map(col => this.generateColumnSQL(col)).join(',\n    ');
    
    let sql = `CREATE TABLE IF NOT EXISTS ${fullTableName} (\n    ${columns}`;
    
    // Add constraints if any
    if (tableDefinition.constraints && tableDefinition.constraints.length > 0) {
      const constraints = tableDefinition.constraints.join(',\n    ');
      sql += `,\n    ${constraints}`;
    }
    
    sql += '\n  )';
    
    return sql;
  }

  /**
   * Generate column definition SQL
   */
  private generateColumnSQL(column: ColumnDefinition): string {
    let sql = `"${column.name}" ${column.type}`;
    
    // Add length for VARCHAR, CHAR, etc.
    if (column.length && (column.type.includes('VARCHAR') || column.type.includes('CHAR'))) {
      sql += `(${column.length})`;
    }
    
    // Add PRIMARY KEY
    if (column.primaryKey) {
      sql += ' PRIMARY KEY';
    }
    
    // Add UNIQUE constraint
    if (column.unique) {
      sql += ' UNIQUE';
    }
    
    // Add NOT NULL constraint
    if (column.nullable === false) {
      sql += ' NOT NULL';
    }
    
    // Add DEFAULT value
    if (column.default !== undefined) {
      if (typeof column.default === 'string' && column.default !== 'CURRENT_TIMESTAMP') {
        sql += ` DEFAULT '${column.default}'`;
      } else {
        sql += ` DEFAULT ${column.default}`;
      }
    }
    
    return sql;
  }

  /**
   * Generate CREATE INDEX SQL
   */
  generateCreateIndexSQL(index: IndexDefinition, tableName: string, schemaName?: string): string {
    const fullTableName = schemaName ? `"${schemaName}"."${tableName}"` : `"${tableName}"`;
    const indexName = schemaName ? `"${schemaName}"."${index.name}"` : `"${index.name}"`;
    
    const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
    const columns = index.columns.map(col => `"${col}"`).join(', ');
    const indexType = index.type ? ` USING ${index.type}` : '';
    
    return `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${indexName} ON ${fullTableName} (${columns})${indexType}`;
  }

  /**
   * Generate CREATE TRIGGER SQL
   */
  generateCreateTriggerSQL(trigger: TriggerDefinition, tableName: string, schemaName?: string): string {
    const fullTableName = schemaName ? `"${schemaName}"."${tableName}"` : `"${tableName}"`;
    const triggerName = `${trigger.name}_${tableName}`;
    // PostgreSQL doesn't support schema-qualified trigger names - triggers belong to the table's schema
    const quotedTriggerName = `"${triggerName}"`;
    
    let sql = `CREATE TRIGGER ${quotedTriggerName}\n`;
    sql += `  ${trigger.timing} ${trigger.event} ON ${fullTableName}\n`;
    sql += `  FOR EACH ROW`;
    
    if (trigger.condition) {
      sql += ` WHEN (${trigger.condition})`;
    }
    
    sql += ` EXECUTE FUNCTION ${trigger.function}`;
    
    return sql;
  }

  /**
   * Create schema if not exists
   */
  async createSchema(schemaName: string): Promise<void> {
    const sql = `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`;
    await this.dataSource.query(sql);
  }

  /**
   * Create table with all its components (indexes, triggers)
   */
  async createTable(
    tableDefinition: TableDefinition, 
    schemaName?: string,
    tableName?: string
  ): Promise<void> {
    const finalTableName = tableName || tableDefinition.name;
    
    // Create table
    const createTableSQL = this.generateCreateTableSQL(finalTableName, tableDefinition, schemaName);
    await this.dataSource.query(createTableSQL);
    
    // Create indexes
    if (tableDefinition.indexes) {
      for (const index of tableDefinition.indexes) {
        const createIndexSQL = this.generateCreateIndexSQL(index, finalTableName, schemaName);
        await this.dataSource.query(createIndexSQL);
      }
    }
    
    // Create triggers
    if (tableDefinition.triggers) {
      for (const trigger of tableDefinition.triggers) {
        const triggerName = `${trigger.name}_${finalTableName}`;
        const triggerExists = await this.triggerExists(triggerName, finalTableName, schemaName);
        
        if (!triggerExists) {
          const createTriggerSQL = this.generateCreateTriggerSQL(trigger, finalTableName, schemaName);
          await this.dataSource.query(createTriggerSQL);
        } else {
          console.log(`Trigger ${triggerName} already exists for table ${finalTableName}, skipping creation`);
        }
      }
    }
  }

  /**
   * Create multiple tables in a schema
   */
  async createTables(
    tableDefinitions: TableDefinition[], 
    schemaName?: string
  ): Promise<void> {
    for (const tableDefinition of tableDefinitions) {
      await this.createTable(tableDefinition, schemaName);
    }
  }

  /**
   * Create complete schema with all tables
   */
  async createCompleteSchema(schemaDefinition: SchemaDefinition): Promise<void> {
    // Create schema
    await this.createSchema(schemaDefinition.name);
    
    // Create functions if any
    if (schemaDefinition.functions) {
      for (const functionSQL of schemaDefinition.functions) {
        await this.dataSource.query(functionSQL);
      }
    }
    
    // Create all tables
    await this.createTables(schemaDefinition.tables, schemaDefinition.name);
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string, schemaName?: string): Promise<boolean> {
    const schema = schemaName || 'public';
    const result = await this.dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2
      )
    `, [schema, tableName]);
    
    return result[0]?.exists || false;
  }

  /**
   * Check if schema exists
   */
  async schemaExists(schemaName: string): Promise<boolean> {
    const result = await this.dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = $1
      )
    `, [schemaName]);
    
    return result[0]?.exists || false;
  }

  /**
   * Check if trigger exists
   */
  async triggerExists(triggerName: string, tableName: string, schemaName?: string): Promise<boolean> {
    const schema = schemaName || 'public';
    const result = await this.dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_schema = $1 AND trigger_name = $2 AND event_object_table = $3
      )
    `, [schema, triggerName, tableName]);
    
    return result[0]?.exists || false;
  }

  /**
   * Drop table if exists
   */
  async dropTable(tableName: string, schemaName?: string): Promise<void> {
    const fullTableName = schemaName ? `"${schemaName}"."${tableName}"` : `"${tableName}"`;
    await this.dataSource.query(`DROP TABLE IF EXISTS ${fullTableName} CASCADE`);
  }

  /**
   * Drop schema if exists
   */
  async dropSchema(schemaName: string, cascade: boolean = false): Promise<void> {
    const cascadeKeyword = cascade ? ' CASCADE' : '';
    await this.dataSource.query(`DROP SCHEMA IF EXISTS "${schemaName}"${cascadeKeyword}`);
  }
}