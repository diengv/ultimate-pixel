import { DataSource, DataSourceOptions } from "typeorm";
import { databaseConfig, MAX_CONNECTION_POOL_SIZE } from '../configs/database';


export const tenantConnections: { [schemaName: string]: DataSource } = {};

export async function getShopConnection(
  shopCode: string
): Promise<DataSource> {
  const connectionName = `tenant_${shopCode}`;

  if (tenantConnections[connectionName]) {
    const connection = tenantConnections[connectionName];
    return connection;
  } else {
    const dataSource = new DataSource({
      ...databaseConfig,
      name: connectionName,
      schema: connectionName,
      poolSize: MAX_CONNECTION_POOL_SIZE,
    } as DataSourceOptions);

    await dataSource.initialize();

    tenantConnections[connectionName] = dataSource;

    return dataSource;
  }
}