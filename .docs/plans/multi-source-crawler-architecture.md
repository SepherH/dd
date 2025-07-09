# 多源監理站酒駕資料爬蟲框架規劃

> 日期：2025-07-09

## 1. 概述

為了從全國各地監理站收集酒駕累犯資料，需要建立一個能夠處理多種資料格式的爬蟲框架。不同監理站使用不同的資料發佈方式：PDF文件、圖片、HTML表格或其他格式。本框架將採用策略設計模式，針對每種資料來源提供專門的爬蟲實現。

## 2. 架構設計

### 2.1 核心接口定義

```typescript
/**
 * 資料來源定義
 */
export interface DataSource {
  // 資料來源唯一識別碼
  id: string;
  // 監理站名稱
  name: string;
  // 基礎URL
  baseUrl: string;
  // 資料類型：PDF、圖片、HTML表格等
  dataType: 'pdf' | 'image' | 'html-table' | 'html-list' | 'api' | 'other';
  // 更新頻率（天）
  updateFrequency: number;
  // 資料開始年份
  startYear?: number;
  // 其他元資料
  metadata?: Record<string, any>;
}

/**
 * 爬蟲策略接口
 */
export interface CrawlerStrategy {
  // 策略ID
  id: string;
  // 策略名稱
  name: string;
  // 支持的資料類型
  supportedDataTypes: string[];
  // 執行爬蟲
  execute(source: DataSource): Promise<CrawlResult>;
  // 驗證資料源是否符合此策略
  validate(source: DataSource): boolean;
  // 提取鏈接
  extractLinks(html: string, source: DataSource): Promise<string[]>;
  // 下載資料
  downloadData(urls: string[], source: DataSource): Promise<string[]>;
  // 解析資料
  parseData(filePaths: string[], source: DataSource): Promise<OffenderRecord[]>;
}

/**
 * 爬蟲結果接口
 */
export interface CrawlResult {
  // 資料來源ID
  sourceId: string;
  // 原始檔案路徑
  rawFilePaths: string[];
  // 處理後檔案路徑
  processedFilePaths: string[];
  // 提取的紀錄
  records: OffenderRecord[];
  // 爬取時間
  crawlTime: Date;
  // 紀錄計數
  recordCount: number;
  // 狀態：成功/部分成功/失敗
  status: 'success' | 'partial' | 'failed';
  // 錯誤信息
  error?: string;
  // 其他元資料
  metadata?: Record<string, any>;
}

/**
 * 酒駕累犯記錄接口
 */
export interface OffenderRecord {
  // 唯一識別碼 (系統生成)
  id?: string;
  // 序號 (原始資料中的序號)
  sequenceNumber?: string;
  // 姓名
  name: string;
  // 違規日期
  violationDate?: Date | string;
  // 違規條款
  violationClause?: string;
  // 違規地點
  violationLocation?: string;
  // 違規事實
  violationFacts: string;
  // 資料來源ID
  sourceId: string;
  // 原始檔案路徑
  sourcePath: string;
  // 建立時間
  createdAt: Date;
  // 更新時間
  updatedAt: Date;
  // 資料有效性
  isValid: boolean;
  // 其他元資料
  metadata?: Record<string, any>;
}
```

### 2.2 爬蟲協調器

```typescript
/**
 * 爬蟲協調器
 */
export class CrawlerOrchestrator {
  private strategies: Map<string, CrawlerStrategy> = new Map();
  private sources: DataSource[] = [];
  
  /**
   * 註冊爬蟲策略
   */
  registerStrategy(strategy: CrawlerStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }
  
  /**
   * 添加資料來源
   */
  addSource(source: DataSource): void {
    this.sources.push(source);
  }
  
  /**
   * 為資料來源選擇合適的爬蟲策略
   */
  selectStrategyForSource(source: DataSource): CrawlerStrategy | null {
    for (const strategy of this.strategies.values()) {
      if (strategy.validate(source)) {
        return strategy;
      }
    }
    return null;
  }
  
  /**
   * 執行指定資料來源的爬蟲
   */
  async crawlSource(sourceId: string): Promise<CrawlResult | null> {
    const source = this.sources.find(s => s.id === sourceId);
    if (!source) return null;
    
    const strategy = this.selectStrategyForSource(source);
    if (!strategy) return null;
    
    return await strategy.execute(source);
  }
  
  /**
   * 執行所有資料來源的爬蟲
   */
  async crawlAll(): Promise<Record<string, CrawlResult>> {
    const results: Record<string, CrawlResult> = {};
    
    for (const source of this.sources) {
      try {
        const result = await this.crawlSource(source.id);
        if (result) {
          results[source.id] = result;
        }
      } catch (error) {
        console.error(`爬取資料源 ${source.name} 失敗:`, error);
        results[source.id] = {
          sourceId: source.id,
          rawFilePaths: [],
          processedFilePaths: [],
          records: [],
          crawlTime: new Date(),
          recordCount: 0,
          status: 'failed',
          error: error.message
        };
      }
    }
    
    return results;
  }
  
  /**
   * 根據更新頻率安排爬蟲任務
   */
  scheduleJobs(): void {
    // 實作定時任務調度邏輯
  }
}
```

## 3. 爬蟲策略實現

### 3.1 PDF爬蟲策略

```typescript
/**
 * PDF文件爬蟲策略
 */
export class PdfCrawlerStrategy implements CrawlerStrategy {
  id = 'pdf-crawler';
  name = 'PDF爬蟲策略';
  supportedDataTypes = ['pdf'];
  
  async execute(source: DataSource): Promise<CrawlResult> {
    // 實現PDF爬取邏輯
    // 1. 獲取主頁面HTML
    // 2. 提取PDF鏈接
    // 3. 下載PDF文件
    // 4. 解析PDF內容提取記錄
    // 5. 返回結果
  }
  
  validate(source: DataSource): boolean {
    return source.dataType === 'pdf';
  }
  
  async extractLinks(html: string, source: DataSource): Promise<string[]> {
    // 實現提取PDF鏈接的邏輯
  }
  
  async downloadData(urls: string[], source: DataSource): Promise<string[]> {
    // 實現下載PDF的邏輯
  }
  
  async parseData(filePaths: string[], source: DataSource): Promise<OffenderRecord[]> {
    // 實現解析PDF數據的邏輯
  }
}
```

### 3.2 圖片爬蟲策略

```typescript
/**
 * 圖片爬蟲策略
 */
export class ImageCrawlerStrategy implements CrawlerStrategy {
  id = 'image-crawler';
  name = '圖片爬蟲策略';
  supportedDataTypes = ['image'];
  
  async execute(source: DataSource): Promise<CrawlResult> {
    // 實現圖片爬取邏輯
    // 1. 獲取主頁面HTML
    // 2. 提取圖片鏈接
    // 3. 下載圖片
    // 4. 使用OCR解析圖片內容
    // 5. 提取記錄
    // 6. 返回結果
  }
  
  validate(source: DataSource): boolean {
    return source.dataType === 'image';
  }
  
  async extractLinks(html: string, source: DataSource): Promise<string[]> {
    // 實現提取圖片鏈接的邏輯
  }
  
  async downloadData(urls: string[], source: DataSource): Promise<string[]> {
    // 實現下載圖片的邏輯
  }
  
  async parseData(filePaths: string[], source: DataSource): Promise<OffenderRecord[]> {
    // 實現OCR解析圖片並提取數據的邏輯
  }
}
```

### 3.3 HTML表格爬蟲策略

```typescript
/**
 * HTML表格爬蟲策略
 */
export class HtmlTableCrawlerStrategy implements CrawlerStrategy {
  id = 'html-table-crawler';
  name = 'HTML表格爬蟲策略';
  supportedDataTypes = ['html-table'];
  
  async execute(source: DataSource): Promise<CrawlResult> {
    // 實現HTML表格爬取邏輯
    // 1. 獲取頁面HTML
    // 2. 使用cheerio解析HTML表格
    // 3. 提取表格數據
    // 4. 返回結果
  }
  
  validate(source: DataSource): boolean {
    return source.dataType === 'html-table';
  }
  
  async extractLinks(html: string, source: DataSource): Promise<string[]> {
    // HTML表格策略可能不需要提取鏈接
    return [source.baseUrl];
  }
  
  async downloadData(urls: string[], source: DataSource): Promise<string[]> {
    // 獲取HTML頁面內容
  }
  
  async parseData(htmlContents: string[], source: DataSource): Promise<OffenderRecord[]> {
    // 解析HTML表格並提取數據
  }
}
```

### 3.4 臺中市交通事件裁決處爬蟲

```typescript
/**
 * 臺中市交通事件裁決處爬蟲策略
 * 這是一個針對特定網站的具體實現，繼承自PdfCrawlerStrategy
 */
export class TaichungCrawlerStrategy extends PdfCrawlerStrategy {
  id = 'taichung-crawler';
  name = '臺中市交通事件裁決處爬蟲策略';
  
  // 覆寫父類方法，實現臺中市特有的邏輯
  async extractLinks(html: string, source: DataSource): Promise<string[]> {
    // 臺中市特有的PDF鏈接提取邏輯
  }
  
  // 覆寫其他需要自定義的方法
}
```

## 4. 數據源定義

```typescript
/**
 * 監理站數據源定義
 */
export const TRAFFIC_DATA_SOURCES: DataSource[] = [
  {
    id: 'taichung-traffic',
    name: '臺中市交通事件裁決處',
    baseUrl: 'https://www.traffic.taichung.gov.tw/unit/form/index.asp?Parser=2,18,591',
    dataType: 'pdf',
    updateFrequency: 7, // 每週更新
    startYear: 2022,
    metadata: {
      pdfLinkPattern: '酒(毒)駕及拒測累犯名單',
      dateFormat: 'yyyy年M月d日'
    }
  },
  {
    id: 'taipei-traffic',
    name: '臺北市交通裁決所',
    baseUrl: 'https://tpcmv.gov.taipei/News.aspx?n=A0A8D4D2B78108D8&sms=72544237BBE4C5F6',
    dataType: 'pdf',
    updateFrequency: 7,
    metadata: {
      pdfLinkPattern: '酒駕累犯名單'
    }
  },
  {
    id: 'kaohsiung-traffic',
    name: '高雄市交通事件裁決中心',
    baseUrl: 'https://www.kscmv.gov.tw/News.aspx?n=91B6CE8F4C1C073C&sms=E6E6C5CEAD74AAAC',
    dataType: 'html-table',
    updateFrequency: 7
  }
  // 可以添加更多數據源定義
];
```

## 5. 資料儲存與管理

### 5.1 檔案結構

```
data/
├── raw/                      # 原始數據
│   ├── taichung-traffic/     # 按數據源分類
│   │   ├── pdf/
│   │   │   └── 2025/         # 按年份分類
│   │   │       └── 07/       # 按月份分類
│   ├── taipei-traffic/
│   │   └── ...
│   └── ...
├── processed/                # 處理後的數據
│   ├── taichung-traffic/
│   │   └── ...
│   └── ...
└── extracted/                # 提取的結構化數據
    ├── taichung-traffic/
    │   └── ...
    └── ...
```

### 5.2 數據匯總與去重

```typescript
/**
 * 數據整合服務
 */
export class DataIntegrationService {
  /**
   * 合併來自不同來源的記錄
   */
  async mergeRecords(): Promise<void> {
    // 實現記錄合併邏輯
  }
  
  /**
   * 識別並處理重複記錄
   */
  async deduplicateRecords(): Promise<void> {
    // 實現記錄去重邏輯
  }
  
  /**
   * 數據標準化
   */
  async standardizeData(): Promise<void> {
    // 實現數據標準化邏輯
  }
}
```

## 6. 爬蟲執行與監控

### 6.1 定時執行

```typescript
import { CronJob } from 'cron';
import { CrawlerOrchestrator } from './orchestrator';

/**
 * 爬蟲調度器
 */
export class CrawlerScheduler {
  private orchestrator: CrawlerOrchestrator;
  private jobs: Map<string, CronJob> = new Map();
  
  constructor(orchestrator: CrawlerOrchestrator) {
    this.orchestrator = orchestrator;
  }
  
  /**
   * 為所有數據源安排定時任務
   */
  scheduleAllSources(): void {
    for (const source of this.orchestrator.getSources()) {
      this.scheduleSource(source);
    }
  }
  
  /**
   * 為單個數據源安排定時任務
   */
  scheduleSource(source: DataSource): void {
    // 根據數據源的更新頻率設置cron表達式
    const cronExpression = this.getCronExpressionFromFrequency(source.updateFrequency);
    
    const job = new CronJob(cronExpression, async () => {
      console.log(`開始執行 ${source.name} 爬蟲任務`);
      await this.orchestrator.crawlSource(source.id);
      console.log(`完成 ${source.name} 爬蟲任務`);
    });
    
    this.jobs.set(source.id, job);
    job.start();
  }
  
  /**
   * 根據更新頻率生成cron表達式
   */
  private getCronExpressionFromFrequency(days: number): string {
    // 實現根據天數生成cron表達式的邏輯
    if (days === 1) return '0 0 * * *';           // 每天午夜執行
    if (days === 7) return '0 0 * * 1';           // 每週一午夜執行
    if (days === 30) return '0 0 1 * *';          // 每月1號午夜執行
    return '0 0 1,15 * *';                        // 默認每月1號和15號執行
  }
}
```

### 6.2 日誌和監控

```typescript
/**
 * 爬蟲日誌服務
 */
export class CrawlerLogger {
  /**
   * 記錄爬蟲執行情況
   */
  logCrawlResult(result: CrawlResult): void {
    // 實現日誌記錄邏輯
  }
  
  /**
   * 發送告警通知
   */
  sendAlert(message: string, level: 'info' | 'warning' | 'error'): void {
    // 實現告警通知邏輯
  }
}
```

## 7. 實施計劃

### 7.1 第一階段：框架搭建（1週）

1. 實現核心接口和基礎類
2. 建立資料存儲結構
3. 設計爬蟲協調器

### 7.2 第二階段：基本爬蟲實現（2週）

1. 實現臺中市交通事件裁決處爬蟲（現有）
2. 實現PDF爬蟲策略（通用）
3. 實現HTML表格爬蟲策略

### 7.3 第三階段：擴展與優化（2週）

1. 實現圖片爬蟲策略與OCR集成
2. 添加更多數據源定義
3. 實現數據整合服務

### 7.4 第四階段：部署與監控（1週）

1. 實現定時任務調度
2. 建立日誌和監控系統
3. 部署到生產環境

## 8. 需注意事項

1. **法律合規性**：爬取公開資訊時需遵守相關法規
2. **爬蟲禮儀**：設置適當的請求間隔，避免對目標網站造成過大負載
3. **錯誤處理**：針對網站結構變更、網絡異常等情況實現穩健的錯誤處理機制
4. **數據隱私**：確保數據處理和存儲符合個人資料保護法規
5. **跨平台兼容**：確保系統在不同環境下均可運行
6. **可擴展性**：設計架構應易於添加新的數據源和爬蟲策略

## 9. 結語

本框架設計為酒駕累犯資料爬蟲提供了一個可擴展、模塊化的解決方案。透過策略模式的實現，可以輕鬆支持不同監理站的不同資料格式，並且隨著需求變化能夠快速擴展新功能。
