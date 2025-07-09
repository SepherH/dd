/**
 * 配置工具模組
 * 
 * 負責處理環境變數和配置相關功能
 */

import { logger } from './logger.js';

/**
 * 解析監理所列表字串
 * @returns {Array<{name: string, url: string, crawlerType: string}>} 監理所資訊陣列
 */
export function parseDmvsList() {
  try {
    const dmvsListStr = process.env.DMVS_LIST;
    
    if (!dmvsListStr) {
      logger.warn('環境變數 DMVS_LIST 未設定，將使用空陣列');
      return [];
    }
    
    // 以逗號分隔不同監理所
    return dmvsListStr.split(',')
      .map(item => {
        // 以豎線符號分隔每個監理所的資訊
        const [name, url, crawlerType] = item.split('|');
        
        if (!name || !url || !crawlerType) {
          logger.warn(`監理所資訊格式不正確: ${item}`);
          return null;
        }
        
        return {
          name: name.trim(),
          url: url.trim(),
          crawlerType: crawlerType.trim().toLowerCase()
        };
      })
      .filter(Boolean); // 過濾掉無效的項目
  } catch (error) {
    logger.error(`解析監理所列表失敗: ${error.message}`);
    return [];
  }
}

/**
 * 取得應用程式配置
 * @returns {Object} 應用程式配置物件
 */
export function getAppConfig() {
  return {
    port: parseInt(process.env.API_PORT) || 3000,
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
    rateLimit: parseInt(process.env.API_RATE_LIMIT) || 100,
    logLevel: process.env.LOG_LEVEL || 'info',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    crawlerInterval: process.env.CRAWLER_INTERVAL || '0 0 * * *', // 每天午夜
    crawlerTimeout: parseInt(process.env.CRAWLER_TIMEOUT) || 60000
  };
}
