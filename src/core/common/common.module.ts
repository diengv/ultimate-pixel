import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import configs from '../../configs';
import { AppCacheModule } from '../cache.module';
import { StorageModule } from '../storage/storage.module';
import { AppService } from '../../app.service';
import { LogCleanupService } from '../services/log-cleanup.service';

@Module({
  imports: [
    // Config globally
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      cache: false,
      expandVariables: true,
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
    }),

    // Scheduler
    ScheduleModule.forRoot(),

    // Shared modules
    AppCacheModule,
    StorageModule,
  ],
  providers: [AppService, LogCleanupService],
  exports: [
    ConfigModule,
    TypeOrmModule,
    ScheduleModule,
    AppCacheModule,
    StorageModule,
    AppService,
    LogCleanupService,
  ],
})
export class CommonModule {}
