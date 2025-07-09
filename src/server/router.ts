/**
 * Bun HTTP 伺服器路由處理器
 * 
 * 提供 API 請求的路由分發和處理功能
 */

// Bun 型別定義
type Serve = typeof Bun.serve extends (options: infer T) => any ? T : never;
import { logger } from '../utils/logger';

// 基礎路由類型定義
export type RouteHandler = (req: Request, params?: Record<string, string>) => Promise<Response> | Response;

interface Route {
  pattern: RegExp;
  methods: Record<string, RouteHandler>;
}

// 路由管理器
class Router {
  private routes: Route[] = [];

  // 註冊 GET 方法
  get(path: string, handler: RouteHandler): Router {
    return this.registerRoute('GET', path, handler);
  }

  // 註冊 POST 方法
  post(path: string, handler: RouteHandler): Router {
    return this.registerRoute('POST', path, handler);
  }

  // 註冊 PUT 方法
  put(path: string, handler: RouteHandler): Router {
    return this.registerRoute('PUT', path, handler);
  }

  // 註冊 PATCH 方法
  patch(path: string, handler: RouteHandler): Router {
    return this.registerRoute('PATCH', path, handler);
  }

  // 註冊 DELETE 方法
  delete(path: string, handler: RouteHandler): Router {
    return this.registerRoute('DELETE', path, handler);
  }

  // 處理請求
  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // 記錄請求
    logger.debug(`${method} ${path}`);

    try {
      // 尋找匹配的路由
      for (const route of this.routes) {
        const match = path.match(route.pattern);
        if (match) {
          // 檢查方法是否支援
          const handler = route.methods[method];
          if (handler) {
            // 從路徑模式提取參數
            const params = this.extractParams(route.pattern, path);
            return await handler(req, params);
          } else {
            // 方法不被支援
            return new Response(`不支援的 HTTP 方法：${method}`, { status: 405 });
          }
        }
      }

      // 找不到路由
      return new Response('找不到資源', { status: 404 });
    } catch (error: any) {
      // 伺服器內部錯誤
      logger.error(`請求處理失敗: ${error.message}`);
      return new Response(`伺服器內部錯誤: ${error.message}`, { status: 500 });
    }
  }

  // 建立 Bun 伺服器處理函數
  getServerHandler(): Serve {
    return {
      fetch: this.handleRequest.bind(this),
      error(error: Error): Response {
        logger.error(`伺服器錯誤: ${error.message}`);
        return new Response(`伺服器內部錯誤: ${error.message}`, { status: 500 });
      },
    };
  }

  // 私有方法：註冊路由
  private registerRoute(method: string, path: string, handler: RouteHandler): Router {
    // 將 URL 路徑轉換為正則表達式
    const pattern = this.pathToRegex(path);

    // 檢查是否已存在此路徑的路由
    for (const route of this.routes) {
      if (route.pattern.source === pattern.source) {
        // 路由已存在，新增方法處理器
        route.methods[method] = handler;
        return this;
      }
    }

    // 新建路由
    this.routes.push({
      pattern,
      methods: { [method]: handler },
    });

    return this;
  }

  // 私有方法：將路徑轉換為正則表達式
  private pathToRegex(path: string): RegExp {
    // 替換參數為命名捕捉組
    // 例如 /users/:id => /users/(?<id>[^/]+)
    const pattern = path
      .replace(/\/:([^/]+)/g, '/(?<$1>[^/]+)')
      .replace(/^\//, '^\\/')
      .replace(/\/$/, '\\/?$')
      .replace(/([^/])$/, '$1\\/?$');

    return new RegExp(pattern);
  }

  // 私有方法：從 URL 路徑提取參數
  private extractParams(pattern: RegExp, path: string): Record<string, string> {
    const params: Record<string, string> = {};
    const match = path.match(pattern);
    
    if (match && match.groups) {
      Object.assign(params, match.groups);
    }

    return params;
  }
}

// 建立並導出預設路由器實例
export const router = new Router();
export default router;
