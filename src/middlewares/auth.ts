/**
 * 認證中間件
 * 
 * 負責 API 認證和授權
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * API 金鑰驗證中間件
 * @param req Express 請求物件
 * @param res Express 回應物件
 * @param next Express 下一個處理函數
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
    try {
        // 從請求標頭獲取 API 金鑰
        const apiKey = req.headers['x-api-key'] as string | undefined;
        
        // 檢查 API 金鑰是否存在
        if (!apiKey) {
            res.status(401).json({
                status: 'error',
                message: '未提供 API 金鑰'
            });
            return;
        }
        
        // TODO: 實際專案中，應該從資料庫或配置中驗證 API 金鑰
        // 此處僅為示範，在實際應用中請實作完整的驗證邏輯
        const validApiKey = process.env.TEST_API_KEY || 'test_api_key_123';
        
        if (apiKey !== validApiKey) {
            logger.warn(`無效的 API 金鑰嘗試: ${apiKey.substring(0, 5)}...`);
            res.status(403).json({
                status: 'error',
                message: '無效的 API 金鑰'
            });
            return;
        }
        
        // 驗證通過，繼續處理請求
        next();
    } catch (error: any) {
        logger.error(`API 金鑰驗證失敗: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: '伺服器認證處理錯誤'
        });
    }
}
