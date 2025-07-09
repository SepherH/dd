/**
 * 資料庫連線測試工具
 * 
 * 此工具用於測試 MariaDB 資料庫連線是否正常
 */

import dotenv from 'dotenv';
import { knex, Knex } from 'knex';
import fs from 'fs';
import path from 'path';

// 載入 .env 檔案
dotenv.config();

console.log('========================================');
console.log('資料庫連線測試');
console.log('========================================');

// 顯示環境變數 (不顯示密碼)
console.log('環境變數:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || 'undefined'}`);
console.log(`DB_USER: ${process.env.DB_USER || 'undefined'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '******' : 'undefined'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || 'undefined'}`);
console.log('----------------------------------------');

// 建立資料庫連線
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'drunk_driving_records'
  },
  debug: true
});

async function testConnection() {
  try {
    console.log('嘗試連線到資料庫...');
    
    // 測試連線
    const result = await db.raw('SELECT 1 as connection_test');
    
    console.log('連線成功!');
    console.log('資料庫回應:', result[0]);
    
  } catch (error) {
    console.error('連線失敗!');
    console.error('錯誤詳情:', error);
    
    // 檢查是否是網路連線問題
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('\n可能的問題:');
      console.log('1. 主機名稱或 IP 地址可能不正確');
      console.log('2. 資料庫服務可能沒有運行');
      console.log('3. 防火牆可能阻擋了連線');
      console.log('4. 遠端資料庫可能未允許遠端連線');
    }
    
    // 檢查是否是認證問題
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n可能的問題:');
      console.log('1. 資料庫用戶名可能不正確');
      console.log('2. 資料庫密碼可能不正確');
      console.log('3. 用戶可能沒有足夠的權限');
    }
    
    // 檢查是否是資料庫不存在問題
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n可能的問題:');
      console.log('1. 指定的資料庫不存在');
      console.log('2. 用戶沒有訪問該資料庫的權限');
    }
  } finally {
    // 關閉資料庫連線
    await db.destroy();
  }
}

// 執行測試
testConnection().catch(console.error);
