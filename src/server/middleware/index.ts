/**
 * HTTP 伺服器中介軟體系統
 * 
 * 提供請求處理管道，用於實現身份驗證、速率限制、CORS 等功能
 */

import { logger } from '../../utils/logger';

export type NextFunction = () => Promise<Response | void> | Response | void;
export type MiddlewareFunction = (req: Request, next: NextFunction) => Promise<Response | void> | Response | void;

/**
 * 中介軟體管理器
 * 允許註冊和執行中介軟體鏈
 */
export class MiddlewareManager {
  private middlewares: MiddlewareFunction[] = [];

  /**
   * 註冊中介軟體函數
   * @param middleware 中介軟體函數
   */
  use(middleware: MiddlewareFunction): MiddlewareManager {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * 執行中介軟體鏈
   * @param req HTTP 請求物件
   * @returns HTTP 回應物件或 undefined (繼續處理)
   */
  async execute(req: Request): Promise<Response | void> {
    // 中介軟體索引
    let currentIndex = 0;

    // 下一個中介軟體函數
    const next: NextFunction = async () => {
      // 如果所有中介軟體都已執行，則返回 undefined 繼續路由處理
      if (currentIndex >= this.middlewares.length) {
        return undefined;
      }

      // 獲取當前中介軟體並遞增索引
      const middleware = this.middlewares[currentIndex++];

      try {
        // 執行當前中介軟體
        return await middleware(req, next);
      } catch (error: any) {
        logger.error(`中介軟體執行失敗: ${error.message}`);
        // 發生錯誤時返回 500 回應
        return new Response(`伺服器錯誤: ${error.message}`, { status: 500 });
      }
    };

    // 開始執行中介軟體鏈
    return next();
  }
}

// CORS 中介軟體
export function cors(options: {
  allowOrigin?: string | string[];
  allowMethods?: string[];
  allowHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}): MiddlewareFunction {
  const defaultOptions = {
    allowOrigin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: false,
    maxAge: 86400
  };

  const opts = { ...defaultOptions, ...options };

  return async (req: Request, next: NextFunction) => {
    // 如果是預檢請求 (OPTIONS)
    if (req.method === 'OPTIONS') {
      const headers = new Headers();
      
      // 設定 CORS 標頭
      const origin = Array.isArray(opts.allowOrigin) 
        ? opts.allowOrigin.join(',') 
        : opts.allowOrigin;
      
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', opts.allowMethods.join(','));
      headers.set('Access-Control-Allow-Headers', opts.allowHeaders.join(','));
      
      if (opts.allowCredentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      headers.set('Access-Control-Max-Age', opts.maxAge.toString());
      
      // 返回預檢回應
      return new Response(null, { status: 204, headers });
    }

    // 對於非預檢請求，添加 CORS 標頭後繼續處理
    const response = await next();
    
    if (response) {
      // 建立新標頭以避免修改原始回應標頭
      const newHeaders = new Headers(response.headers);
      
      const origin = Array.isArray(opts.allowOrigin) 
        ? opts.allowOrigin.join(',') 
        : opts.allowOrigin;
      
      newHeaders.set('Access-Control-Allow-Origin', origin);
      
      if (opts.allowCredentials) {
        newHeaders.set('Access-Control-Allow-Credentials', 'true');
      }
      
      // 建立新回應以包含更新後的標頭
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  };
}

// 日誌記錄中介軟體
export function requestLogger(): MiddlewareFunction {
  return async (req: Request, next: NextFunction) => {
    const start = Date.now();
    const url = new URL(req.url);
    
    // 紀錄請求開始
    logger.debug(`開始處理請求: ${req.method} ${url.pathname}`);
    
    // 處理請求
    const response = await next();
    
    // 計算處理時間
    const duration = Date.now() - start;
    
    // 如果有回應，紀錄狀態碼
    if (response) {
      logger.debug(`完成請求: ${req.method} ${url.pathname} ${response.status} (${duration}ms)`);
    } else {
      logger.debug(`完成請求: ${req.method} ${url.pathname} (${duration}ms)`);
    }
    
    return response;
  };
}

// JSON 解析中介軟體
export function jsonParser(): MiddlewareFunction {
  return async (req: Request, next: NextFunction) => {
    // 檢查請求內容類型是否為 JSON
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        // 複製請求並解析 JSON 內容
        const clonedReq = req.clone();
        const json = await clonedReq.json();
        
        // 將解析後的 JSON 附加到請求物件
        (req as any).json = json;
      } catch (error: any) {
        logger.error(`JSON 解析失敗: ${error.message}`);
        return new Response('無效的 JSON 格式', { status: 400 });
      }
    }
    
    return next();
  };
}

// 建立預設中介軟體管理器
export const middleware = new MiddlewareManager();

// 預設匯出
export default middleware;
