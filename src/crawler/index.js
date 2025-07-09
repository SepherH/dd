/**
 * 爬蟲主模組
 * 
 * 負責協調不同監理所網站的爬蟲任務
 */

import { parseDmvsList } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { processDmvData } from '../services/processor.js';
import { tableCrawler } from './strategies/tableCrawler.js';
import { imageCrawler } from './strategies/imageCrawler.js';

/**
 * 執行所有爬蟲任務
 * @returns {Promise<void>}
 */
export async function runCrawlers() {
  try {
    const dmvsList = parseDmvsList();
    logger.info(`開始爬取 ${dmvsList.length} 個監理所網站資料`);
    
    // 依序執行每個監理所的爬蟲
    for (const dmv of dmvsList) {
      logger.info(`開始爬取 ${dmv.name} 的資料`);
      
      try {
        // 根據不同的爬蟲類型選擇對應的爬蟲策略
        let rawData = [];
        
        switch (dmv.crawlerType) {
          case 'table':
            rawData = await tableCrawler(dmv.url);
            break;
          case 'image':
            rawData = await imageCrawler(dmv.url);
            break;
          default:
            logger.warn(`未支援的爬蟲類型: ${dmv.crawlerType}，跳過 ${dmv.name}`);
            continue;
        }
        
        // 處理爬取到的資料
        if (rawData.length > 0) {
          await processDmvData(rawData, dmv.name);
          logger.info(`成功處理 ${rawData.length} 筆 ${dmv.name} 的資料`);
        } else {
          logger.warn(`${dmv.name} 未爬取到資料`);
        }
      } catch (error) {
        logger.error(`爬取 ${dmv.name} 資料失敗: ${error.message}`);
        // 繼續處理下一個監理所，不中斷整體流程
      }
    }
    
    logger.info('所有爬蟲任務完成');
  } catch (error) {
    logger.error(`爬蟲執行失敗: ${error.message}`);
    throw error;
  }
}
