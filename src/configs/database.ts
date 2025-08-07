import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ultimate_pixel',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    autoLoadEntities: true,
    logging: process.env.NODE_ENV === 'development',
  }),
);