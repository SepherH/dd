/**
 * 資料庫遷移腳本
 * 
 * 執行資料庫遷移，建立所需的資料表結構
 */

import { knex, testConnection } from '../database/knexConfig';
import { logger } from '../utils/logger';
import path from 'path';
import type { Knex } from 'knex';

async function main() {
    try {
        logger.info('開始資料庫遷移流程...');
        
        // 先測試資料庫連線
        const connected = await testConnection();
        if (!connected) {
            logger.error('資料庫連線失敗，無法執行遷移');
            process.exit(1);
        }
        
        // 設定遷移檔案路徑
        const migrationsDir = path.join(process.cwd(), 'src', 'database', 'migrations');
        logger.info(`將從 ${migrationsDir} 載入遷移檔案`);
        
        // 確認遷移表是否存在，若不存在則建立
        const migrationTableExists = await knex.schema.hasTable('knex_migrations');
        if (!migrationTableExists) {
            logger.info('建立遷移紀錄表...');
            await knex.schema.createTable('knex_migrations', (table: Knex.CreateTableBuilder) => {
                table.increments();
                table.string('name');
                table.integer('batch');
                table.timestamp('migration_time');
            });
            
            await knex.schema.createTable('knex_migrations_lock', (table: Knex.CreateTableBuilder) => {
                table.increments();
                table.integer('is_locked');
            });
            logger.info('已建立遷移紀錄表');
        }
        
        // 執行遷移
        logger.info('開始執行遷移檔案...');
        
        // 直接載入並執行遷移檔案
        const migration = await import('../database/migrations/20250709_initial_schema.js');
        await migration.up(knex);
        
        logger.info('遷移完成，資料表結構已建立');
        
        // 查詢已建立的資料表
        logger.info('查詢資料庫中的資料表...');
        const tables = await knex.raw('SHOW TABLES');
        
        logger.info('資料表列表:');
        for (const table of tables[0]) {
            const tableName = Object.values(table)[0];
            logger.info(`- ${tableName}`);
        }
        
        process.exit(0);
    } catch (error: any) {
        logger.error(`遷移執行失敗: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    } finally {
        // 關閉連線
        await knex.destroy();
    }
}

// 執行遷移
main();
