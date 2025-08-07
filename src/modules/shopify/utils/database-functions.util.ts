import { DataSource } from 'typeorm';

export class DatabaseFunctionsUtil {
  constructor(private dataSource: DataSource) {}

  /**
   * Create the standard updated_at trigger function
   */
  async createUpdatedAtFunction(): Promise<void> {
    const functionSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    await this.dataSource.query(functionSQL);
  }

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

  /**
   * Create all standard database functions
   */
  async createStandardFunctions(): Promise<void> {
    // Create updated_at trigger function if it doesn't exist
    const functionExists = await this.functionExists('update_updated_at_column');
    if (!functionExists) {
      await this.createUpdatedAtFunction();
    }
  }
}