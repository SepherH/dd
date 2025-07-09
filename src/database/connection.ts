/**
 * 資料庫連線模組
 */
import mariadb from 'mariadb';
import { logger } from '../utils/logger';
import { config } from 'dotenv';

// 載入環境變數
config();

// 建立連線池
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'drunk_driving_registry',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5'),
    supportBigNumbers: true,
    bigNumberStrings: true,
    // 確保正確處理多語系和編碼問題
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
});

/**
 * 取得資料庫連線
 * @returns Promise<mariadb.PoolConnection>
 */
export async function getConnection(): Promise<mariadb.PoolConnection> {
    try {
        const connection = await pool.getConnection();
        logger.debug('資料庫連線成功');
        return connection;
    } catch (error: any) {
        logger.error(`資料庫連線失敗: ${error.message}`);
        throw error;
    }
}

/**
 * 執行資料庫查詢
 * @param query SQL 查詢字串
 * @param params 查詢參數
 * @returns 查詢結果
 */
export async function query<T>(query: string, params?: any[]): Promise<T> {
    let conn: mariadb.PoolConnection | undefined;
    
    try {
        conn = await getConnection();
        const result = await conn.query(query, params);
        return result as unknown as T;
    } catch (error: any) {
        logger.error(`資料庫查詢失敗: ${error.message}`);
        throw error;
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

/**
 * 檢查資料庫連線
 * @returns 布林值，連線成功為 true
 */
export async function testConnection(): Promise<boolean> {
    let conn: mariadb.PoolConnection | undefined;
    
    try {
        conn = await getConnection();
        await conn.query('SELECT 1 as connection_test');
        logger.info('資料庫連線測試成功');
        return true;
    } catch (error: any) {
        logger.error(`資料庫連線測試失敗: ${error.message}`);
        return false;
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

/**
 * 關閉所有資料庫連線
 */
export async function closeAllConnections(): Promise<void> {
    try {
        await pool.end();
        logger.info('所有資料庫連線已關閉');
    } catch (error: any) {
        logger.error(`關閉資料庫連線失敗: ${error.message}`);
        throw error;
    }
}
