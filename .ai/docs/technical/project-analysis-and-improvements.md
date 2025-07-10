# 專案分析與改進建議

## 專案概述

「酒駕累犯名單整合平台」是一個以 Bun 執行環境為基礎的專案，旨在從各監理所網站爬取酒駕累犯資料，使用 AI 技術整理表單和圖片資料，並提供開放 API 接口。目前專案使用 TypeScript 作為主要開發語言，MariaDB 作為資料庫，並結合爬蟲功能和 RESTful API。

## 現有架構分析

### 技術堆疊

根據記憶與專案分析，目前的技術堆疊包括：
- **執行環境**：Node.js + Bun
- **資料庫**：MariaDB
- **資料庫套件**：Knex.js
- **爬蟲**：Axios + Cheerio
- **任務排程**：Cron
- **API 框架**：Bun 原生 HTTP 伺服器
- **AI 處理**：OpenAI API

然而，有一處不一致：README.md 中提到資料庫是 MariaDB，但根據 `.env.example` 文件，配置的是 MongoDB 連線字串。

### 目錄結構

專案的主要代碼組織在 `src` 目錄下，包含以下主要子目錄：
- `api`：API 接口相關代碼
- `crawler`：爬蟲實現
- `database`：資料庫配置
- `middlewares`：中間件
- `models`：資料模型
- `server`：伺服器相關代碼
- `services`：服務層代碼
- `tools`：工具函數
- `types`：TypeScript 類型定義
- `utils`：工具函數

### 程式碼質量評估

#### 優點：

1. **模塊化結構**：程式碼按功能分類，組織清晰
2. **強型別系統**：使用 TypeScript 提供型別安全
3. **錯誤處理**：大部分核心功能包含適當的錯誤捕獲與日誌記錄
4. **配置靈活**：環境變數設計適當，支持不同的運行模式
5. **文件化**：代碼註解清晰，且 README 文件詳盡

#### 存在問題：

1. **資料庫配置不一致**：README.md 與 .env.example 之間的資料庫類型不一致
2. **中間件實現不完整**：API 金鑰驗證和速率限制標記為 TODO，尚未完全實現
3. **PDF 解析邏輯簡單**：現有的 PDF 解析較為基本，可能無法處理複雜格式
4. **爬蟲排程實現有限**：排程已設定，但尚未實現真正的爬蟲執行邏輯
5. **缺少完整的測試**：未發現完整的單元測試或整合測試
6. **資料庫降級機制**：當資料庫連接失敗時，使用模擬模式可能導致生產環境下的不可預測行為

## 改進建議

### 1. 資料庫配置統一與優化

**問題**：README.md 與 .env.example 中的資料庫配置不一致，一個提到 MariaDB，一個設定為 MongoDB。

**建議**：
- 統一資料庫技術選擇，根據專案需求確定使用 MariaDB 還是 MongoDB
- 更新所有相關文件以保持一致性
- 考慮在啟動時進行資料庫遷移和驗證

```typescript
// 建議的資料庫初始化流程
async function initDatabase() {
  try {
    await testConnection();
    await runMigrations();
    logger.info('資料庫初始化完成');
  } catch (error) {
    logger.error(`資料庫初始化失敗: ${error.message}`);
    // 根據環境決定是否繼續啟動
    if (process.env.NODE_ENV === 'production') {
      logger.error('生產環境資料庫連接失敗，終止啟動');
      process.exit(1);
    }
  }
}
```

### 2. 完善 API 安全機制

**問題**：API 金鑰驗證和速率限制被標記為 TODO，尚未完全實現。

**建議**：
- 實現完整的 API 金鑰驗證，包括金鑰儲存、驗證和過期機制
- 加入完整的速率限制實現，使用 Redis 或記憶體快取來追蹤 API 使用情況
- 加強請求日誌，包括成功率、效能指標和異常監控

```typescript
// 建議的 API 金鑰驗證實現
async function validateApiKey(req: Request, next: Function) {
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
  
  try {
    // 從資料庫或快取中驗證 API 金鑰
    const isValid = await apiKeyService.validate(apiKey);
    if (!isValid) {
      return new Response(JSON.stringify({
        status: 'error',
        message: '無效的 API 金鑰'
      }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 記錄使用情況
    await apiKeyService.recordUsage(apiKey, req.url);
    
    return next();
  } catch (error) {
    logger.error(`API 金鑰驗證錯誤: ${error.message}`);
    return new Response(JSON.stringify({
      status: 'error',
      message: '伺服器錯誤'
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 3. 增強 PDF 解析功能

**問題**：現有的 PDF 解析功能相對基本，可能無法處理複雜的格式或提取結構化數據。

**建議**：
- 結合 OpenAI API 進一步提升文本提取和理解能力
- 使用機器學習模型預處理 PDF 內容，提高解析準確率
- 增加針對不同 PDF 格式的專用解析器
- 加入表格和圖片識別功能

```typescript
// 建議的增強型 PDF 解析流程
async function enhancedPdfProcessing(filePath: string): Promise<any[]> {
  // 基本文本提取
  const rawText = await extractTextFromPdf(filePath);
  
  // 使用 OpenAI API 進行結構化處理
  const structuredData = await openaiService.structureText(rawText, {
    template: offenderDataTemplate,
    instructions: '從文本中提取酒駕累犯資料，包括姓名、違規日期、違規地點和違規條款'
  });
  
  // 表格識別（如果需要）
  const tables = await pdfTableExtractor.extract(filePath);
  
  // 整合所有數據源
  return mergeDataSources(structuredData, tables);
}
```

### 4. 完善爬蟲實現

**問題**：爬蟲排程已設定，但尚未看到完整的爬蟲執行邏輯和錯誤恢復機制。

**建議**：
- 實現完整的爬蟲管理系統，包括個別網站的爬蟲策略
- 加入重試機制、代理輪換和反爬蟲對策
- 實現增量爬取，只下載和處理新資料
- 添加爬蟲執行狀態儀表板

```typescript
// 建議的爬蟲管理系統
class CrawlerManager {
  private crawlers: Map<string, BaseCrawler> = new Map();
  private proxyManager: ProxyManager;
  private dbService: DatabaseService;
  
  constructor() {
    this.proxyManager = new ProxyManager();
    this.dbService = new DatabaseService();
    this.initCrawlers();
  }
  
  private initCrawlers() {
    // 根據配置初始化各網站爬蟲
    const dmvsList = process.env.DMVS_LIST?.split(',') || [];
    for (const dmv of dmvsList) {
      const [name, url, type] = dmv.split('|');
      const crawler = this.createCrawler(name, url, type);
      this.crawlers.set(name, crawler);
    }
  }
  
  private createCrawler(name: string, url: string, type: string): BaseCrawler {
    switch (type) {
      case 'table':
        return new TableCrawler(name, url, this.proxyManager, this.dbService);
      case 'pdf':
        return new PdfCrawler(name, url, this.proxyManager, this.dbService);
      default:
        return new GenericCrawler(name, url, this.proxyManager, this.dbService);
    }
  }
  
  public async runAll() {
    logger.info(`開始執行全部爬蟲，共 ${this.crawlers.size} 個網站`);
    
    for (const [name, crawler] of this.crawlers.entries()) {
      try {
        logger.info(`開始爬取 ${name}`);
        await crawler.run();
        logger.info(`完成爬取 ${name}`);
      } catch (error) {
        logger.error(`爬取 ${name} 失敗: ${error.message}`);
      }
    }
  }
}
```

### 5. 加強測試覆蓋率

**問題**：專案似乎缺少完整的測試套件。

**建議**：
- 為核心功能添加單元測試
- 實現 API 端點的整合測試
- 加入爬蟲的模擬測試
- 設定持續整合流程，確保每次提交都運行測試

```typescript
// 單元測試示例 (使用 Jest 或 Bun 的測試工具)
describe('PDF 解析服務', () => {
  it('應該能正確提取文本', async () => {
    const text = await extractTextFromPdf('./fixtures/sample.pdf');
    expect(text).toContain('特定關鍵字');
  });
  
  it('應該能正確解析違規者資料', () => {
    const text = '1 張三 112/05/21 酒後駕車';
    const result = parseOffenderData(text);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('張三');
    expect(result[0].violationDate).toBe('112/05/21');
  });
});
```

### 6. 改進資料庫降級機制

**問題**：當資料庫連接失敗時使用模擬模式可能導致生產環境下的不可預測行為。

**建議**：
- 建立更強健的資料庫連接重試機制
- 針對不同環境採取不同的降級策略
- 實現正確的資料快取，以減輕資料庫負擔
- 考慮使用 Redis 或其他快取解決方案作為次要資料存儲

```typescript
// 改進的資料庫連接管理
class DatabaseConnectionManager {
  private retryCount = 0;
  private maxRetries = 5;
  private connectionPool: any = null;
  private cache: Map<string, {data: any, timestamp: number}> = new Map();
  
  async getConnection() {
    if (this.connectionPool) {
      return this.connectionPool;
    }
    
    try {
      this.connectionPool = await createConnectionPool();
      return this.connectionPool;
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.warn(`資料庫連接失敗，嘗試重新連接 (${this.retryCount}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        return this.getConnection();
      }
      
      throw new Error(`無法連接到資料庫: ${error.message}`);
    }
  }
  
  // 實現快取機制
  async queryWithCache(key: string, queryFn: Function, ttlMs: number = 60000) {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < ttlMs) {
      return cached.data;
    }
    
    const data = await queryFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }
}
```

### 7. 前後端整合與使用者界面

**問題**：目前專案主要集中在後端 API 和爬蟲功能，前端界面開發不足。

**建議**：
- 建立管理儀表板，顯示系統狀態、爬蟲進度和資料統計
- 開發簡單的搜尋界面，方便查詢酒駕累犯資料
- 實現數據可視化，提供地區分布和時間趨勢圖表
- 加入使用者認證系統，管理 API 存取權限

```typescript
// 前端整合計劃
/*
1. 使用 React + TypeScript 建立管理儀表板
2. 實現以下頁面:
   - 系統狀態概覽
   - 爬蟲管理與監控
   - 資料搜尋與篩選
   - API 使用統計與管理
   - 使用者與權限管理
3. 使用 Chart.js 或 D3.js 實現數據可視化
4. 實現 JWT 認證系統
*/
```

### 8. 系統監控與日誌

**問題**：現有日誌系統基本可用，但缺乏集中式監控和警報機制。

**建議**：
- 實現結構化日誌，方便後續分析
- 加入效能指標監控，包括 API 回應時間、資料庫查詢效能等
- 設置閾值警報系統，當系統異常時發送通知
- 考慮整合 ELK 堆疊或其他日誌管理系統

```typescript
// 增強的日誌系統
class EnhancedLogger {
  private baseLogger: any;
  private metrics: Map<string, number[]> = new Map();
  
  constructor(baseLogger: any) {
    this.baseLogger = baseLogger;
  }
  
  info(message: string, context: object = {}) {
    this.log('info', message, context);
  }
  
  error(message: string, context: object = {}) {
    this.log('error', message, context);
    
    // 錯誤報告
    this.reportError(message, context);
  }
  
  private log(level: string, message: string, context: object) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      environment: process.env.NODE_ENV,
      service: 'drunk-driving-registry'
    };
    
    this.baseLogger[level](JSON.stringify(logEntry));
  }
  
  // 記錄效能指標
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // 定期匯報指標
    this.reportMetricsIfNeeded();
  }
  
  private reportError(message: string, context: object) {
    // 實現錯誤報告，如發送郵件或發送到監控系統
  }
  
  private reportMetricsIfNeeded() {
    // 實現指標匯報邏輯
  }
}
```

## 結論

「酒駕累犯名單整合平台」專案具有良好的基礎架構和清晰的模組設計，但在某些關鍵領域還需要完善和優化。通過實施上述建議，系統將變得更加穩健、安全和可維護。最重要的改進領域包括統一資料庫配置、增強 API 安全性、完善爬蟲實現和提升測試覆蓋率。

這些改進將有助於系統更有效地處理資料爬取、儲存和檢索的需求，同時提供更穩定和安全的 API 服務。
