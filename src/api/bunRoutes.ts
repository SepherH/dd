/**
 * Bun HTTP 伺服器 API 路由定義
 * 
 * 將 Express 路由轉換為 Bun 原生 HTTP 伺服器路由
 */

import { logger } from '../utils/logger';
import router from '../server/router';
import { offenderController } from './controllers/offenderController';
import { statisticsController } from './controllers/statisticsController';
import { middleware } from '../server/middleware';

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
 * 將 Express 控制器方法轉換為 Bun HTTP 處理器
 */
function adaptController(controllerFn: Function) {
  return async (req: Request, params?: Record<string, string>) => {
    try {
      // 創建模擬的 Express 請求、回應和下一步函數
      const url = new URL(req.url);
      
      // 模擬 Express req 物件
      const mockReq: any = {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        params: params || {},
        query: Object.fromEntries(url.searchParams.entries())
      };
      
      // 如果請求有 body 且是 JSON 格式，解析它
      if (req.headers.get('content-type')?.includes('application/json')) {
        try {
          const clonedReq = req.clone();
          mockReq.body = await clonedReq.json();
        } catch (error) {
          return new Response(JSON.stringify({
            status: 'error',
            message: '無效的 JSON 格式'
          }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // 模擬 Express res 物件
      let statusCode = 200;
      let responseBody: any = null;
      let responseHeaders = new Headers({
        'Content-Type': 'application/json'
      });
      
      const mockRes: any = {
        status(code: number) {
          statusCode = code;
          return mockRes;
        },
        json(body: any) {
          responseBody = body;
        },
        send(body: any) {
          responseBody = body;
        },
        setHeader(name: string, value: string) {
          responseHeaders.set(name, value);
          return mockRes;
        },
        redirect(url: string) {
          statusCode = 302;
          responseHeaders.set('Location', url);
        }
      };
      
      // 模擬 Express next 函數
      const mockNext = (error?: Error) => {
        if (error) {
          throw error;
        }
      };
      
      // 執行控制器方法
      await controllerFn(mockReq, mockRes, mockNext);
      
      // 如果有回應，返回它
      if (responseBody !== null) {
        const body = typeof responseBody === 'string' 
          ? responseBody 
          : JSON.stringify(responseBody);
        
        return new Response(body, {
          status: statusCode,
          headers: responseHeaders
        });
      }
      
      // 沒有回應，返回 204 No Content
      return new Response(null, { status: 204 });
    } catch (error: any) {
      logger.error(`API 控制器錯誤: ${error.message}`);
      
      return new Response(JSON.stringify({
        status: 'error',
        message: '伺服器內部錯誤'
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * 設置 API 路由
 */
export function setupRoutes(): void {
  // API 狀態檢查
  router.get('/api/status', async () => {
    return new Response(JSON.stringify({
      status: 'ok',
      serverTime: new Date().toISOString(),
      version: '0.1.0'
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
  // 注意：這裡我們使用路徑前綴方式替代 Express 的 Router
  
  // 酒駕累犯查詢 API
  router.get('/api/v1/offenders', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return adaptController(offenderController.list)(req);
  });
  
  router.get('/api/v1/offenders/:id', async (req, params) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return adaptController(offenderController.getById)(req, params);
  });
  
  router.get('/api/v1/offenders/search', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return adaptController(offenderController.search)(req);
  });
  
  // 統計資料 API
  router.get('/api/v1/statistics', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return adaptController(statisticsController.getOverview)(req);
  });
  
  router.get('/api/v1/statistics/by-region', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return adaptController(statisticsController.getByRegion)(req);
  });
  
  router.get('/api/v1/statistics/by-date', async (req) => {
    const apiKeyRes = await validateApiKey(req, () => {});
    if (apiKeyRes instanceof Response) return apiKeyRes;
    
    const rateLimitRes = await rateLimiter(req, () => {});
    if (rateLimitRes instanceof Response) return rateLimitRes;
    
    return adaptController(statisticsController.getByDate)(req);
  });
  
  // 404 路由處理 (在 router.ts 中已處理)
  
  logger.info('Bun HTTP API 路由設定完成');
}

// 匯出路由設定函數
export default { setupRoutes };
