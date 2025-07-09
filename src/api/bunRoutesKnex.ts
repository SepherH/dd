/**
 * Bun HTTP 伺服器 API 路由定義 (Knex.js 版本)
 * 
 * 使用 Knex.js 實現的控制器
 */

import { logger } from '../utils/logger';
import router from '../server/router';
import OffenderController from './controllers/offenderControllerKnex';
import { statisticsController } from './controllers/statisticsController';

// 自訂中介軟體：API 金鑰驗證
const validateApiKey = async (req: Request, next: Function) => {
  const apiKey = req.headers.get('x-api-key');
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      status: 'error',
      message: '缺少 API 金鑰'
    }), { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // TODO: 實作從資料庫驗證 API 金鑰
  // 暫時直接通過
  
  return next();
};

// 自訂中介軟體：速率限制
const rateLimiter = async (req: Request, next: Function) => {
  // TODO: 實作速率限制
  return next();
};

/**
 * 設置 API 路由
 */
export function setupRoutes(): void {
  // API 狀態檢查
  router.get('/api/status', async () => {
    return new Response(JSON.stringify({
      status: 'ok',
      serverTime: new Date().toISOString(),
      version: '0.1.0',
      database: 'knex'
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  });
  
  // API 文檔重導向
  router.get('/api/docs', async () => {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/docs/index.html' }
    });
  });
  
  // 註冊 v1 API 路由
  
  // 酒駕累犯查詢 API - 使用 Knex.js 實現
  router.get('/api/v1/offenders', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return OffenderController.getOffenders(req);
  });
  
  router.get('/api/v1/offenders/:id', async (req, params) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    const id = parseInt(params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ID 格式無效'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return OffenderController.getOffenderById(req, id);
  });
  
  router.get('/api/v1/offenders/search', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return OffenderController.searchOffenders(req);
  });
  
  // 統計資料 API - 仍使用原有控制器
  router.get('/api/v1/statistics', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    // 使用原有的統計控制器
    return statisticsController.getOverview(req, {}, () => {});
  });
  
  router.get('/api/v1/statistics/by-region', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return statisticsController.getByRegion(req, {}, () => {});
  });
  
  router.get('/api/v1/statistics/by-date', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return statisticsController.getByDate(req, {}, () => {});
  });
  
  logger.info('Knex.js 版本 API 路由設定完成');
}

// 匯出路由設定函數
export default { setupRoutes };
