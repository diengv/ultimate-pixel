import { DataSource, DataSourceOptions } from 'typeorm';
import { publicConfig } from './orm.config';
import { tenantConfig } from './tenant-orm.config';
import { camelCase } from 'typeorm/util/StringUtils';

const defaultSchema = 'tenant_default';

if (process.argv.length < 3) {
  console.log('Please choose either public or tenanted');
  process.exit(1);
}

const environment = process.argv[2];
const type = process.argv[3];

if (['dev', 'development'].includes(environment)) {
  process.env.NODE_ENV = 'development';
} else if (['test', 'testing'].includes(environment)) {
  process.env.NODE_ENV = 'test';
} else if (['prod', 'production'].includes(environment)) {
  process.env.NODE_ENV = 'production';
} else {
  console.log('Please choose either dev/development, test/testing, or prod/production');
  process.exit(1);
}

let dataSource: DataSource = null;

if (type === 'public') {
  dataSource = new DataSource(publicConfig as DataSourceOptions);
} else if (type === 'tenanted') {
  dataSource = new DataSource({ ...tenantConfig, schema: defaultSchema } as DataSourceOptions);
} else {
  console.log('Please choose either public or tenanted');
  process.exit(1);
}

generateMigrations().then(({ upSqls, downSqls }) => {
  console.log('Migration generated successfully');
  const fileContent = getTemplate('migration', new Date().getTime(), upSqls, downSqls.reverse());
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, `../migrations/${type}/${new Date().getTime()}-migration.ts`);
  fs.writeFileSync(filePath, fileContent);
  process.exit(0);
}).catch((error) => {
  console.log(error);
  process.exit(1);
});

function queryParams(parameters: any[] | undefined): string {
  if (!parameters || !parameters.length) {
    return '';
  }
  return `, ${JSON.stringify(parameters)}`;
}

async function generateMigrations() {
  await dataSource.initialize();
  const logs = await dataSource.driver.createSchemaBuilder().log();
  let upSqls: string[] = [];
  let downSqls: string[] = [];

  logs.upQueries.forEach((upQuery) => {
    upSqls.push(
      `await queryRunner.query(\`${upQuery.query.replace(/`/g, '\\`').replace(new RegExp(defaultSchema, 'g'), '${schema}')}\`${queryParams(upQuery.parameters)});`
    );
  });
  logs.downQueries.forEach((downQuery) => {
    downSqls.push(
      `await queryRunner.query(\`${downQuery.query.replace(/`/g, '\\`').replace(new RegExp(defaultSchema, 'g'), '${schema}')}\`${queryParams(downQuery.parameters)});`
    );
  });

  return { upSqls, downSqls };
}

function getTemplate(name: string, timestamp: number, upSqls: string[], downSqls: string[]): string {
  const migrationName = `${camelCase(name, true)}${timestamp}`;

  return `import { MigrationInterface, QueryRunner } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export class ${migrationName} implements MigrationInterface {
  name = '${migrationName}'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { schema } = queryRunner.connection.options as PostgresConnectionOptions;
    ${upSqls.join('\n')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const { schema } = queryRunner.connection.options as PostgresConnectionOptions;
    ${downSqls.join('\n')}
  }
}
`;
}