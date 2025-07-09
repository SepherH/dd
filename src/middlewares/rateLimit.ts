/**
 * 速率限制中間件
 * 
 * 防止 API 過度使用，限制請求頻率
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// 簡易內存快取存儲請求計數
interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

// 預設配置
const DEFAULT_WINDOW = 60 * 1000; // 1 分鐘窗口期
const DEFAULT_MAX_REQUESTS = 60; // 每分鐘最多 60 個請求

/**
 * 產生請求者識別碼，依據 IP 位址或 API 金鑰
 * @param req Express 請求物件
 * @returns 請求者識別碼
 */
function getRequesterId(req: Request): string {
    // 優先使用 API 金鑰作為識別碼
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
        return `api_${apiKey}`;
    }
    
    // 使用 IP 位址作為識別碼
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip_${ip}`;
}

/**
 * 速率限制中間件
 * @param req Express 請求物件
 * @param res Express 回應物件
 * @param next Express 下一個處理函數
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    try {
        const requesterId = getRequesterId(req);
        const now = Date.now();
        
        // 取得環境變數或使用預設值
        const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '') || DEFAULT_WINDOW;
        const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '') || DEFAULT_MAX_REQUESTS;
        
        // 初始化或重置過期的請求計數
        if (!store[requesterId] || store[requesterId].resetTime < now) {
            store[requesterId] = {
                count: 0,
                resetTime: now + windowMs
            };
        }
        
        // 增加請求計數
        store[requesterId].count += 1;
        
        // 檢查是否超過限制
        if (store[requesterId].count > maxRequests) {
            logger.warn(`速率限制觸發: ${requesterId} 超過每 ${windowMs/1000} 秒 ${maxRequests} 個請求的限制`);
            
            // 設定響應標頭
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', Math.ceil(store[requesterId].resetTime / 1000));
            res.setHeader('Retry-After', Math.ceil((store[requesterId].resetTime - now) / 1000));
            
            res.status(429).json({
                status: 'error',
                message: '請求頻率過高，請稍後再試'
            });
            return;
        }
        
        // 設定響應標頭
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - store[requesterId].count);
        res.setHeader('X-RateLimit-Reset', Math.ceil(store[requesterId].resetTime / 1000));
        
        next();
    } catch (error: any) {
        logger.error(`速率限制處理錯誤: ${error.message}`);
        next(); // 發生錯誤時，仍讓請求通過，以避免阻擋正常服務
    }
}

// 定期清理過期的記錄
setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach(key => {
        if (store[key].resetTime < now) {
            delete store[key];
        }
    });
}, 60 * 1000); // 每分鐘清理一次
