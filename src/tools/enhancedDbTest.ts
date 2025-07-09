/**
 * 進階資料庫連線診斷工具
 * 
 * 此工具用於詳細診斷資料庫連線問題
 */

import dotenv from 'dotenv';
import { knex, Knex } from 'knex';
import fs from 'fs';
import path from 'path';
import net from 'net';

// 載入 .env 檔案
dotenv.config();

console.log('===============================================');
console.log('資料庫連線診斷工具');
console.log('===============================================');

// 顯示環境變數 (不顯示密碼)
console.log('環境變數資訊:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || '未設定'}`);
console.log(`DB_HOST: ${process.env.DB_HOST || '未設定'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || '未設定'}`);
console.log(`DB_USER: ${process.env.DB_USER || '未設定'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '******' : '未設定'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || '未設定'}`);
console.log('-----------------------------------------------');

// 定義測試用的連線埠
const portsToTest = [3306, 3307, 33060];
const host = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'drunk_driving';

// 測試 TCP 連線埠是否開放
async function testPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`正在測試 ${host}:${port} 連線埠...`);
    
    const socket = new net.Socket();
    
    // 設置 3 秒超時
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      console.log(`連線埠 ${port} 開放!`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`連線埠 ${port} 連線超時`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`連線埠 ${port} 無法連線: ${err.message}`);
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// 測試資料庫連線
async function testDbConnection(config: any): Promise<boolean> {
  console.log(`正在測試資料庫連線 (${config.connection.host}:${config.connection.port})...`);
  
  const db = knex(config);
  
  try {
    // 嘗試執行一個簡單的查詢
    const result = await db.raw('SELECT 1 as connection_test');
    console.log('資料庫連線成功!');
    console.log('回應:', result[0]);
    await db.destroy();
    return true;
  } catch (error: any) {
    console.error('資料庫連線失敗!');
    console.error(`錯誤訊息: ${error.message}`);
    
    if (error.code) {
      console.error(`錯誤代碼: ${error.code}`);
    }
    
    await db.destroy();
    return false;
  }
}

// 主函式
async function main() {
  try {
    console.log('正在檢查網路連線...');
    
    // 檢查連線埠開放狀態
    console.log('\n連線埠檢查:');
    for (const port of portsToTest) {
      await testPort(host, port);
    }
    
    // 嘗試使用預設連線埠連線
    console.log('\n嘗試連線到資料庫:');
    const defaultConfig = {
      client: 'mysql2',
      connection: {
        host: host,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: dbUser,
        password: dbPass,
        database: dbName
      },
      pool: { min: 0, max: 1 },
      acquireConnectionTimeout: 5000
    };
    
    await testDbConnection(defaultConfig);
    
    // 提供連線問題的建議
    console.log('\n===============================================');
    console.log('診斷建議:');
    console.log('===============================================');
    console.log('1. 確認伺服器 IP 和埠號是否正確');
    console.log('2. 確認資料庫使用者名稱和密碼是否正確');
    console.log('3. 確認資料庫使用者是否有權限從遠端連線 (通常需設定 \'%\' 或特定 IP)');
    console.log('4. 檢查伺服器防火牆設定是否允許連線埠 3306');
    console.log('5. 檢查 MySQL/MariaDB 設定檔中的 bind-address 是否設為 0.0.0.0');
    console.log('6. 嘗試在伺服器上執行: GRANT ALL PRIVILEGES ON *.* TO \'使用者名稱\'@\'%\'');
    
  } catch (error: any) {
    console.error('診斷過程發生錯誤:', error.message);
  }
}

// 執行主函式
main().catch(console.error);
