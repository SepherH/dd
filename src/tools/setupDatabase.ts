/**
 * 資料庫初始化與設定工具
 * 
 * 這個工具提供資料庫初始化、遷移和種子資料功能
 * 執行: bun run src/tools/setupDatabase.ts
 */

import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { testConnection } from '../database/knexConfig';

/**
 * 執行系統命令並返回結果
 */
async function execCommand(command: string, args: string[] = []): Promise<boolean> {
  return new Promise((resolve) => {
    logger.info(`執行命令: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, { 
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        logger.info(`命令執行成功: ${command}`);
        resolve(true);
      } else {
        logger.error(`命令執行失敗 (代碼 ${code}): ${command}`);
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      logger.error(`命令執行錯誤: ${error.message}`);
      resolve(false);
    });
  });
}

/**
 * 主函數
 */
async function main() {
  try {
    logger.info('開始設定資料庫...');
    
    // 檢查資料庫連線
    logger.info('正在檢查資料庫連線...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('無法連線至資料庫，請檢查資料庫設定與連線資訊');
      logger.info(`目前資料庫設定:
  - 主機: ${config.database.host}
  - 連接埠: ${config.database.port}
  - 資料庫: ${config.database.name}
  - 使用者: ${config.database.user}
      `);
      
      // 檢查 .env 檔案是否存在
      logger.info('提示: 請確認已經正確設定 .env 檔案');
      logger.info('若尚未設定，可複製 .env.example 並命名為 .env，然後填入正確的資料庫資訊');
      
      process.exit(1);
    }
    
    // 執行資料庫遷移
    logger.info('開始執行資料庫遷移...');
    const migrateSuccess = await execCommand('bun', ['run', 'migrate']);
    
    if (!migrateSuccess) {
      logger.error('資料庫遷移失敗');
      process.exit(1);
    }
    
    // 執行種子資料
    logger.info('開始植入種子資料...');
    const seedSuccess = await execCommand('bun', ['run', 'seed']);
    
    if (!seedSuccess) {
      logger.error('種子資料植入失敗');
      process.exit(1);
    }
    
    logger.info('資料庫設定完成!');
    logger.info('您現在可以啟動應用程式: bun run dev');
    
  } catch (error: any) {
    logger.error(`設定資料庫時發生錯誤: ${error.message}`);
    process.exit(1);
  }
}

// 執行主函數
main();
