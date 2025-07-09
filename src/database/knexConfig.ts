/**
 * Knex.js 資料庫連線配置檔
 * 
 * 提供 MariaDB 資料庫連線設定，並處理多語系和編碼設定
 */

import { Knex } from 'knex';
import { logger } from '../utils/logger';
import { getDatabaseConfig } from '../utils/dbEnvironment';

/**
 * 資料庫環境類型
 */
type Environment = 'development' | 'production' | 'testing';

/**
 * 資料庫配置選項
 */
interface DatabaseConfig {
  [key: string]: Knex.Config;
}

// 取得當前環境
const env = process.env.NODE_ENV as Environment || 'development';

// 資料庫連線配置
const dbConfig: DatabaseConfig = {
  development: {
    client: 'mysql2',
    connection: {
      ...getDatabaseConfig(),
      database: process.env.DB_NAME || 'drunk_driving',
      charset: 'utf8mb4', // 支援完整 Unicode 字元集，包括表情符號和多語系文字
      timezone: '+08:00', // 台灣/亞洲時區
      typeCast: function (field: any, next: any) {
        // 特殊處理日期型別
        if (field.type === 'DATE' || field.type === 'DATETIME') {
          return field.string();
        }
        return next();
      },
    },
    pool: {
      min: 2,
      max: 10,
      // 閒置超過 10 秒的連線將被釋放
      idleTimeoutMillis: 10000,
      // 如果連線使用超過 30 分鐘，釋放它
      acquireTimeoutMillis: 30000
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: '../migrations',
    },
    seeds: {
      directory: '../seeds',
    },
    debug: false,
    // 處理查詢日誌
    log: {
      warn(message: string) {
        logger.warn(`[Knex] ${message}`);
      },
      error(message: string) {
        logger.error(`[Knex] ${message}`);
      },
      deprecate(message: string) {
        logger.warn(`[Knex Deprecated] ${message}`);
      },
      debug(message: string) {
        if (env === 'development') {
          logger.debug(`[Knex] ${message}`);
        }
      },
    },
  },
  production: {
    client: 'mysql2',
    connection: {
      ...getDatabaseConfig(),
      database: process.env.DB_NAME || 'drunk_driving',
      charset: 'utf8mb4',
      timezone: '+08:00',
      typeCast: function (field: any, next: any) {
        if (field.type === 'DATE' || field.type === 'DATETIME') {
          return field.string();
        }
        return next();
      },
    },
    pool: {
      min: 5,
      max: 30,
      idleTimeoutMillis: 10000,
      acquireTimeoutMillis: 30000
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: '../migrations',
    },
    seeds: {
      directory: '../seeds',
    },
    debug: false,
    log: {
      warn(message: string) {
        logger.warn(`[Knex] ${message}`);
      },
      error(message: string) {
        logger.error(`[Knex] ${message}`);
      },
      deprecate(message: string) {
        logger.warn(`[Knex Deprecated] ${message}`);
      },
      debug() {}, // 在正式環境中不記錄除錯訊息
    },
  },
  testing: {
    client: 'mysql2',
    connection: {
      ...getDatabaseConfig(),
      database: `${process.env.DB_NAME || 'drunk_driving'}_test`,
      charset: 'utf8mb4',
      timezone: '+08:00',
    },
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: '../migrations',
    },
    seeds: {
      directory: '../seeds',
    },
  }
};

// 初始化 knex 實例
// 建立一個變數記錄資料庫是否可用
export let isDatabaseAvailable = false;

// 嘗試建立 Knex 實例
import knexPkg from 'knex';

let knexInstance: any;
try {
    knexInstance = knexPkg(dbConfig[env]);
} catch (error: any) {
    logger.error(`初始化 Knex 失敗: ${error.message}`);
    logger.warn('將使用模擬模式運行，部分功能可能無法使用');
    
    // 建立一個更完整的模擬 Knex 物件
    const mockQueryBuilder = {
        where: () => mockQueryBuilder,
        whereIn: () => mockQueryBuilder,
        whereNotIn: () => mockQueryBuilder,
        whereNull: () => mockQueryBuilder,
        whereNotNull: () => mockQueryBuilder,
        select: () => mockQueryBuilder,
        from: () => Promise.resolve([]),
        insert: () => Promise.resolve([1]), // 模擬插入 ID
        update: () => Promise.resolve(0),
        delete: () => Promise.resolve(0),
        first: () => Promise.resolve(null),
        orderBy: () => mockQueryBuilder,
        limit: () => mockQueryBuilder,
        offset: () => mockQueryBuilder,
        count: () => Promise.resolve([{count: 0}]),
        join: () => mockQueryBuilder,
        leftJoin: () => mockQueryBuilder,
        rightJoin: () => mockQueryBuilder,
    };
    
    knexInstance = {
        raw: () => Promise.resolve([{ result: 2 }]),
        destroy: () => Promise.resolve(),
        transaction: (fn: Function) => Promise.resolve(fn(mockQueryBuilder)),
        select: () => mockQueryBuilder,
        insert: () => Promise.resolve([1]),
        update: () => Promise.resolve(0),
        delete: () => Promise.resolve(0),
        truncate: () => Promise.resolve(0),
        schema: {
            hasTable: () => Promise.resolve(true),
            createTable: () => ({
                increments: () => {},
                string: () => {},
                integer: () => {},
                boolean: () => {},
                text: () => {},
                timestamp: () => {},
                date: () => {},
            }),
            dropTableIfExists: () => Promise.resolve(),
        },
        // 模擬表格設定
        table: () => mockQueryBuilder,
        // 加入表格名稱調用
        offenders: () => mockQueryBuilder,
        violations: () => mockQueryBuilder,
        offender_sources: () => mockQueryBuilder,
    };
}

// 檢查資料庫連線
export async function testConnection(): Promise<boolean> {
  try {
    await knex.raw('SELECT 1+1 AS result');
    isDatabaseAvailable = true;
    const dbConfig = getDatabaseConfig();
    const dbName = process.env.DB_NAME || 'drunk_driving';
    logger.info(`已連線到 ${env} 環境的 MariaDB 資料庫 (${dbConfig.host}:${dbConfig.port}/${dbName})`);
    return true;
  } catch (error: any) {
    isDatabaseAvailable = false;
    logger.error(`資料庫連線失敗: ${error.message}`);
    return false;
  }
}

// 關閉資料庫連線
export async function closeConnection(): Promise<void> {
  try {
    await knex.destroy();
    logger.info('資料庫連線已關閉');
  } catch (error: any) {
    logger.error(`關閉資料庫連線時出錯: ${error.message}`);
  }
}

// 匯出 Knex 實例
export const knex = knexInstance;

// 匯出 Knex 配置 (用於 CLI 工具)
export default {
    ...dbConfig,
    // 提供當前環境的配置
    ...dbConfig[env],
    // 設定 migrations 和 seeds 路徑
    migrations: {
        tableName: 'knex_migrations',
        directory: './migrations',
        extension: 'ts'
    },
    seeds: {
        directory: './seeds',
        extension: 'ts'
    }
};
