import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import fs from 'fs';
import path from 'path';

@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);

  constructor(private configService: ConfigService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLogCleanup() {
    const autoDeleteDays = this.configService.get('logger.autoDeleteDays');
    const logPath = this.configService.get('logger.filePath');

    if (autoDeleteDays > 0) {
      this.logger.log('Starting scheduled log cleanup...');
      await this.cleanupOldLogs(logPath, autoDeleteDays);
    }
  }

  private async cleanupOldLogs(logPath: string, days: number) {
    try {
      if (!fs.existsSync(logPath)) {
        this.logger.warn(`Log path does not exist: ${logPath}`);
        return;
      }

      const files = fs.readdirSync(logPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let deletedCount = 0;

      files.forEach(file => {
        const filePath = path.join(logPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.logger.log(`Deleted old log file: ${file}`);
          deletedCount++;
        }
      });

      this.logger.log(`Log cleanup completed. Deleted ${deletedCount} old log files.`);
    } catch (error) {
      this.logger.error('Error during scheduled log cleanup:', error);
    }
  }
}