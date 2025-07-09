/**
 * 酒駕累犯名單整合平台 - 主程式
 * 
 * 這是專案的主入口點，負責初始化資料庫連接、啟動 Bun HTTP API 服務
 * 以及設定爬蟲排程任務
 */

import { config } from 'dotenv';
import { initCrawlerScheduler } from './crawler/scheduler';
import { setupRoutes } from './api/bunRoutes';
import { logger } from './utils/logger';
import { startServer } from './server';

// 載入環境變數
config();

/**
 * 主要的啟動流程
 * 包括：設定路由、啟動伺服器、初始化爬蟲排程
 */
async function main(): Promise<void> {
    try {
        // 設定 API 路由
        setupRoutes();
        
        // 啟動 Bun HTTP 伺服器
        await startServer();
        
        // 初始化爬蟲排程
        initCrawlerScheduler();
        
        logger.info('系統初始化完成');
    } catch (error: any) {
        logger.error(`系統初始化失敗: ${error.message}`);
        process.exit(1);
    }
}

// 執行主程序
main().catch(error => {
    logger.error(`未處理的錯誤: ${error.message}`);
    process.exit(1);
});
