/**
 * Bun 原生 HTTP 伺服器主模組
 * 
 * 整合路由、中介軟體和控制器，提供完整的 HTTP 伺服器功能
 */

import { logger } from '../utils/logger';
import { config } from '../utils/config';
import router from './router';
import middleware, { cors, requestLogger, jsonParser } from './middleware';
import { testConnection } from '../database/knexConfig';

// 載入路由配置
// 根據配置決定是否使用 Knex.js 版本的路由
const useKnexRoutes = config.database?.useKnex || true;

if (useKnexRoutes) {
  // 載入 Knex.js 版本的路由
  import('../api/bunRoutesKnex').then(routes => {
    routes.default.setupRoutes();
    logger.info('已載入 Knex.js 版本的 API 路由');
  }).catch(error => {
    logger.error(`載入 Knex.js 版本路由失敗: ${error.message}`);
    logger.warn('將使用原始路由');
    import('../api/routes');
  });
} else {
  // 使用原始路由
  import('../api/routes');
}

// 設定預設中介軟體
middleware.use(requestLogger());
middleware.use(cors({
  allowOrigin: config.cors?.origins || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  allowCredentials: true,
  maxAge: 86400
}));
middleware.use(jsonParser());

/**
 * 啟動 HTTP 伺服器
 */
export async function startServer(): Promise<void> {
  try {
    // 測試資料庫連線
    // 暫時跳過資料庫連線檢查
    try {
      await testConnection();
      logger.info('資料庫連線成功');
    } catch (error: any) {
      logger.warn('資料庫連線失敗，但伺服器將繼續啟動: ' + (error?.message || '未知錯誤'));
    }

    // 建立請求處理函數
    const requestHandler = async (req: Request): Promise<Response> => {
      try {
        // 先執行中介軟體鏈
        const middlewareResponse = await middleware.execute(req);
        
        // 如果中介軟體返回了回應，直接使用該回應
        if (middlewareResponse instanceof Response) {
          return middlewareResponse;
        }
        
        // 使用路由處理請求
        return await router.handleRequest(req);
      } catch (error: any) {
        logger.error(`請求處理錯誤: ${error.message}`);
        return new Response(`伺服器錯誤: ${error.message}`, { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    };

    // 啟動伺服器
    const server = Bun.serve({
      port: config.server?.port || 3000,
      hostname: config.server?.host || '0.0.0.0',
      fetch: requestHandler,
      error(error: Error) {
        logger.error(`伺服器錯誤: ${error.message}`);
        return new Response(`伺服器錯誤: ${error.message}`, { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      },
    });

    logger.info(`伺服器已啟動! 監聽於 http://${server.hostname}:${server.port}`);
  } catch (error: any) {
    logger.error(`伺服器啟動失敗: ${error.message}`);
    process.exit(1);
  }
}

// 預設匯出
export default { startServer };
