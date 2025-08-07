import { registerAs } from '@nestjs/config';

const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '30';
const LOG_AUTO_DELETE_DAYS = process.env.LOG_AUTO_DELETE_DAYS || '30';

export default registerAs('logger',()=>({
  level: process.env.LOG_LEVEL || 'info',
  toFile: process.env.LOG_TO_FILE === 'true',
  filePath: process.env.LOG_FILE_PATH || './logs',
  maxFiles: parseInt(LOG_MAX_FILES, 10),
  maxSize: process.env.LOG_MAX_SIZE || '10m',
  autoDeleteDays: parseInt(LOG_AUTO_DELETE_DAYS, 10),
}))