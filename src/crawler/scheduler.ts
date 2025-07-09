/**
 * 爬蟲排程器
 * 
 * 負責根據設定的時間間隔，定期執行爬蟲任務
 */

import { CronJob } from 'cron';
import { runCrawlers } from './index';
import { logger } from '../utils/logger';

/**
 * 初始化爬蟲排程
 * @returns CronJob 排程任務實例
 */
export function initCrawlerScheduler(): CronJob {
    try {
        const cronExpression: string = process.env.CRAWLER_INTERVAL || '0 0 * * *'; // 預設每天午夜執行
        
        logger.info(`設定爬蟲排程: ${cronExpression}`);
        
        const job = new CronJob(
            cronExpression,
            async function() {
                logger.info('開始執行排程爬蟲任務');
                try {
                    await runCrawlers();
                    logger.info('爬蟲任務執行完成');
                } catch (error: any) {
                    logger.error(`爬蟲任務執行失敗: ${error.message}`);
                }
            },
            null, // 執行完成後的回調
            true, // 立即啟動
            'Asia/Taipei' // 時區
        );
        
        logger.info(`爬蟲排程已啟動，下次執行時間: ${job.nextDate().toLocaleString('zh-TW')}`);
        
        // 立即執行一次爬蟲（可選）
        // runCrawlers().catch(err => logger.error(`初始爬蟲執行失敗: ${err.message}`));
        
        return job;
    } catch (error: any) {
        logger.error(`爬蟲排程設定失敗: ${error.message}`);
        throw error;
    }
}
