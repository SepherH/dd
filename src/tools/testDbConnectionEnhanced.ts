/**
 * 增強版資料庫連線測試工具
 * 
 * 使用環境自動偵測功能，嘗試連線到資料庫
 */

import dotenv from 'dotenv';
import { knex, Knex } from 'knex';
import { getDatabaseConfig, isInternalNetwork } from '../utils/dbEnvironment';
import { logger } from '../utils/logger';

// 載入環境變數
dotenv.config();

console.log('===============================================');
console.log('增強版資料庫連線測試');
console.log('===============================================');

// 顯示環境變數 (不顯示密碼)
console.log('環境變數資訊:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || '未設定'}`);
console.log(`DB_HOST: ${process.env.DB_HOST || '未設定'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || '未設定'}`);
console.log(`DB_USER: ${process.env.DB_USER || '未設定'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '******' : '未設定'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || '未設定'}`);
console.log(`DB_INTERNAL_HOST: ${process.env.DB_INTERNAL_HOST || '192.168.50.80'}`);
console.log(`DB_USE_INTERNAL: ${process.env.DB_USE_INTERNAL || 'false'}`);
console.log('-----------------------------------------------');

// 檢測網路環境
const internalNetwork = isInternalNetwork();
console.log(`網路環境檢測: ${internalNetwork ? '內部網路' : '外部網路'}`);

// 取得資料庫設定
const dbConfig = getDatabaseConfig();
console.log('資料庫連線設定:');
console.log(`Host: ${dbConfig.host}`);
console.log(`Port: ${dbConfig.port}`);
console.log(`User: ${dbConfig.user}`);
console.log(`Database: ${dbConfig.database}`);
console.log('-----------------------------------------------');

// 建立資料庫連線
const db = knex({
    client: 'mysql2',
    connection: {
        ...dbConfig,
        charset: 'utf8mb4',
        timezone: '+08:00',
    },
    pool: { min: 0, max: 1 },
    acquireConnectionTimeout: 5000,
});

// 測試連線
async function testConnection() {
    console.log(`正在連線到資料庫 ${dbConfig.host}:${dbConfig.port}...`);
    
    try {
        // 嘗試執行簡單查詢
        const result = await db.raw('SELECT 1 as connection_test');
        console.log('資料庫連線成功!');
        console.log('查詢結果:', result[0]);
        return true;
    } catch (error: any) {
        console.error('資料庫連線失敗!');
        console.error(`錯誤訊息: ${error.message}`);
        
        if (error.code) {
            console.error(`錯誤代碼: ${error.code}`);
            
            // 提供一些常見錯誤的說明
            if (error.code === 'ECONNREFUSED') {
                console.error('連線被拒絕。可能的原因:');
                console.error('1. 資料庫伺服器未運行');
                console.error('2. 防火牆阻擋了連線');
                console.error('3. 主機或端口不正確');
                console.error('4. NAT 迴路問題（嘗試設定 DB_USE_INTERNAL=true）');
            } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error('存取被拒絕。可能的原因:');
                console.error('1. 使用者名稱或密碼不正確');
                console.error('2. 使用者沒有從當前主機連線的權限');
            }
        }
        
        return false;
    }
}

// 執行測試並清理
async function main() {
    try {
        await testConnection();
    } catch (error: any) {
        console.error('測試過程發生未預期錯誤:', error.message);
    } finally {
        await db.destroy();
    }
}

main().catch((error: any) => {
    console.error('執行測試時發生錯誤:', error.message);
    process.exit(1);
});
