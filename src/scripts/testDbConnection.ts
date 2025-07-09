/**
 * 資料庫連線測試腳本
 * 
 * 測試資料庫連線並顯示資料表結構
 */

import { knex, testConnection } from '../database/knexConfig';
import { logger } from '../utils/logger';

async function main() {
    try {
        logger.info('開始測試資料庫連線...');
        const connected = await testConnection();

        if (!connected) {
            logger.error('資料庫連線失敗，請檢查連線設定');
            process.exit(1);
        }

        // 取得所有資料表
        logger.info('查詢資料庫中的資料表...');
        const tables = await knex.raw('SHOW TABLES');
        
        logger.info('資料表列表:');
        for (const table of tables[0]) {
            const tableName = Object.values(table)[0];
            logger.info(`- ${tableName}`);
            
            // 查詢資料表結構
            const columns = await knex.raw(`DESCRIBE ${tableName}`);
            logger.info(`  資料表 ${tableName} 的欄位:`);
            
            for (const column of columns[0]) {
                logger.info(`  - ${column.Field} (${column.Type}) ${column.Key === 'PRI' ? '主鍵' : ''} ${column.Null === 'YES' ? '可為空' : '不可為空'}`);
            }
            
            // 查詢資料筆數
            const count = await knex(tableName).count('* as count').first();
            logger.info(`  - 共有 ${count?.count || 0} 筆資料`);
            logger.info('------------------------');
        }

        logger.info('資料庫連線測試完成，連線正常');
        process.exit(0);
    } catch (error: any) {
        logger.error(`資料庫測試時發生錯誤: ${error.message}`);
        process.exit(1);
    } finally {
        // 關閉連線
        await knex.destroy();
    }
}

// 執行測試
main();
