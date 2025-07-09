/**
 * API 路由模組
 * 
 * 定義所有 RESTful API 端點
 */

import express, { Request, Response, NextFunction, Application } from 'express';
import { offenderController } from './controllers/offenderController';
import { statisticsController } from './controllers/statisticsController';
import { validateApiKey } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimit.js';
import { logger } from '../utils/logger';

/**
 * 設定 API 路由
 * @param app Express 應用程式實例
 */
export function setupRoutes(app: Application): void {
    // API 根路由
    const apiRouter = express.Router();
    app.use('/api', apiRouter);
    
    // API 狀態檢查
    apiRouter.get('/status', (req: Request, res: Response) => {
        res.json({
            status: 'ok',
            serverTime: new Date().toISOString(),
            version: '0.1.0'
        });
    });
    
    // API 文檔重導向
    apiRouter.get('/docs', (req: Request, res: Response) => {
        res.redirect('/docs/index.html');
    });
    
    // 需要驗證的 API 路由
    const v1Router = express.Router();
    apiRouter.use('/v1', rateLimiter, validateApiKey, v1Router);
    
    // 酒駕累犯查詢 API
    v1Router.get('/offenders', offenderController.list);
    v1Router.get('/offenders/:id', offenderController.getById);
    v1Router.get('/offenders/search', offenderController.search);
    
    // 統計資料 API
    v1Router.get('/statistics', statisticsController.getOverview);
    v1Router.get('/statistics/by-region', statisticsController.getByRegion);
    v1Router.get('/statistics/by-date', statisticsController.getByDate);
    
    // 處理 404 路由
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            status: 'error',
            message: '找不到請求的資源'
        });
    });
    
    // 全域錯誤處理
    app.use((err: Error & { statusCode?: number }, req: Request, res: Response, next: NextFunction) => {
        const statusCode = err.statusCode || 500;
        
        // 記錄錯誤
        if (statusCode >= 500) {
            logger.error(`API 錯誤: ${err.stack}`);
        } else {
            logger.warn(`API 請求錯誤 (${statusCode}): ${err.message}`);
        }
        
        res.status(statusCode).json({
            status: 'error',
            message: statusCode < 500 ? err.message : '伺服器內部錯誤'
        });
    });
    
    logger.info('API 路由設定完成');
}
