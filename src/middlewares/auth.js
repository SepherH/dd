/**
 * 認證中間件
 * 
 * 負責 API 認證和授權
 */

import { logger } from '../utils/logger.js';

/**
 * API 金鑰驗證中間件
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {express.NextFunction} next 
 */
export function validateApiKey(req, res, next) {
  try {
    // 從請求標頭獲取 API 金鑰
    const apiKey = req.headers['x-api-key'];
    
    // 檢查 API 金鑰是否存在
    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: '未提供 API 金鑰'
      });
    }
    
    // TODO: 實際專案中，應該從資料庫或配置中驗證 API 金鑰
    // 此處僅為示範，在實際應用中請實作完整的驗證邏輯
    const validApiKey = process.env.TEST_API_KEY || 'test_api_key_123';
    
    if (apiKey !== validApiKey) {
      logger.warn(`無效的 API 金鑰嘗試: ${apiKey.substring(0, 5)}...`);
      return res.status(403).json({
        status: 'error',
        message: '無效的 API 金鑰'
      });
    }
    
    // 驗證通過，繼續處理請求
    next();
  } catch (error) {
    logger.error(`API 金鑰驗證失敗: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: '伺服器認證處理錯誤'
    });
  }
}

/**
 * 角色權限驗證中間件
 * @param {Array<string>} requiredRoles 所需角色陣列
 * @returns {Function} 中間件函數
 */
export function requireRoles(requiredRoles) {
  return (req, res, next) => {
    try {
      // 此處僅為示範，實際應用中應該從已認證的使用者資料中取得角色資訊
      const userRoles = req.user ? req.user.roles : ['public'];
      
      // 檢查使用者是否具備所需角色
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        logger.warn(`用戶權限不足: 需要角色 ${requiredRoles.join(', ')}`);
        return res.status(403).json({
          status: 'error',
          message: '權限不足，無法執行此操作'
        });
      }
      
      next();
    } catch (error) {
      logger.error(`角色驗證失敗: ${error.message}`);
      res.status(500).json({
        status: 'error',
        message: '伺服器權限處理錯誤'
      });
    }
  };
}
