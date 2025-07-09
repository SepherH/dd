/**
 * Knex 遷移配置文件
 */
import { config } from './src/utils/config';
import dotenv from 'dotenv';
import { getDatabaseConfig } from './src/utils/dbEnvironment';

// 載入環境變數
dotenv.config();

const knexConfig = {
  development: {
    client: 'mysql2',
    connection: {
      ...getDatabaseConfig(),
      charset: 'utf8mb4',
      timezone: '+08:00',
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
    debug: false,
  },
  
  production: {
    client: 'mysql2',
    connection: {
      ...getDatabaseConfig(),
      charset: 'utf8mb4',
      timezone: '+08:00',
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    pool: {
      min: 2,
      max: 10,
    },
    debug: false,
  },
  
  testing: {
    client: 'mysql2',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT ? parseInt(process.env.TEST_DB_PORT) : 3306,
      user: process.env.TEST_DB_USER || 'root',
      password: process.env.TEST_DB_PASSWORD || '',
      database: process.env.TEST_DB_NAME || 'drunk_driving_records_test',
      charset: 'utf8mb4',
      timezone: '+08:00',
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
    debug: false,
  }
};

// 導出配置
export default knexConfig;
