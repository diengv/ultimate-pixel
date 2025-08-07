import appConfig from './app';
import corsConfig from './cors';
import shopifyConfig from './shopify';
import databaseConfig from './database';
import authConfig from './auth';
import loggerConfig from './logger';
import cacheConfig from './cache';
import storageConfig from './storage';
import ipFilterConfig from './ipFilter';

export default [
  appConfig,
  corsConfig,
  shopifyConfig,
  databaseConfig,
  authConfig,
  loggerConfig,
  cacheConfig,
  storageConfig,
  ipFilterConfig
];
