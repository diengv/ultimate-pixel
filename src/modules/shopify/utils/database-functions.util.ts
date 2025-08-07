import { DataSource } from 'typeorm';

export class DatabaseFunctionsUtil {
  constructor(private dataSource: DataSource) {}

  /**
   * Check if function exists
   */
  async functionExists(functionName: string, schemaName: string = 'public'): Promise<boolean> {
    const result = await this.dataSource.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = $1 AND p.proname = $2
      )
    `, [schemaName, functionName]);
    
    return result[0]?.exists || false;
  }
}