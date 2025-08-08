import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async createTenant(tenantDto: CreateTenantDto): Promise<Tenant> {
    const tenant = new Tenant();
    tenant.name = tenantDto.name;
    await this.dataSource.getRepository(Tenant).save(tenant);

    const schemaName = `tenant_${tenant.id}`;
    await this.dataSource.query(`CREATE SCHEMA ${schemaName}`);

    // Run migrations for the new schema
    await this.runMigrations(schemaName);

    return tenant;
  }

  private async runMigrations(schemaName: string) {
    const tenantConfig = {
      ...this.dataSource.options,
      schema: schemaName,
    };

    const tenantDataSource = new DataSource(tenantConfig);
    await tenantDataSource.initialize();
    await tenantDataSource.runMigrations();
    await tenantDataSource.destroy();
  }
}