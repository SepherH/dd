# 酒駕累犯名單整合平台 - 專案架構

## 概述

此專案是一個酒駕累犯資料整合平台，目前正在進行技術轉換：
- 從 JavaScript 轉換到 TypeScript
- 從舊版資料庫架構轉換到 MariaDB
- 從 Express 轉換到 Bun 原生 HTTP 伺服器
- 使用 Knex.js 作為資料庫查詢建構器

## 目錄結構

```
src/
├── api/                      # API 相關模組
│   ├── bunRoutes.ts          # Bun HTTP 伺服器路由設定
│   ├── routes.ts             # (舊) Express 路由設定
│   └── controllers/          # API 控制器
│       ├── offenderController.ts
│       └── statisticsController.ts
├── crawler/                  # 爬蟲模組
│   ├── index.ts              # 爬蟲主模組
│   ├── scheduler.ts          # 爬蟲排程器
│   └── strategies/           # 爬蟲策略
│       ├── imageCrawler.ts   # 圖片爬蟲策略
│       └── tableCrawler.ts   # 表格爬蟲策略
├── database/                 # 資料庫相關模組
│   ├── connection.ts         # MariaDB 連線管理
│   ├── knexConfig.ts         # Knex.js 配置
│   ├── migration.ts          # 資料遷移腳本
│   └── schema.sql            # 資料庫結構定義
├── middlewares/              # API 中介軟體
│   ├── auth.ts               # 驗證中介軟體
│   └── rateLimit.ts          # 速率限制中介軟體
├── models/                   # 資料模型
│   └── offenderRecord.ts     # 酒駕累犯資料模型
├── server/                   # Bun HTTP 伺服器
│   ├── index.ts              # 伺服器主模組
│   ├── router.ts             # 路由處理器
│   └── middleware/           # 伺服器中介軟體
│       └── index.ts          # 中介軟體系統
├── services/                 # 服務模組
│   ├── aiService.ts          # AI 服務模組
│   └── formParser.ts         # 表單解析服務
├── types/                    # 型別定義
│   └── index.ts              # 共用型別定義
├── utils/                    # 工具函式
│   ├── config.ts             # 配置管理
│   └── logger.ts             # 日誌工具
└── index.ts                  # 應用程式主入口點
```

## 舊版資料庫架構殘留問題

目前專案中仍有舊版資料庫架構的殘留部分，主要集中在以下檔案中：

### 1. 模型定義中的舊架構殘留

**檔案位置：** `src/models/offenderRecord.js`

此檔案使用舊版架構定義了資料模型，需要替換為 Knex.js 實現的版本。與 TypeScript 版的 `offenderRecord.ts` 並存，但目前仍被引用。

```javascript
// 舊版資料模型定義方式，已不再使用
// 此代碼已被 Knex.js 版本取代
```

### 2. 資料遷移腳本中的依賴

**檔案位置：** `src/database/migration.ts`

此腳本負責遷移資料到 MariaDB，包含特定的資料庫依賴。

```typescript
// 遷移腳本依賴引入
import { query } from './connection';
import { logger } from '../utils/logger';
import { config } from 'dotenv';

// 資料結構定義
interface Source {
    name: string;
    url?: string;
    imageUrl?: string;
    crawlTime: Date;
}

interface OffenderRecord {
    name: string;
    idNumber?: string;
    licensePlate?: string;
    gender?: 'male' | 'female' | null;
    violationDate?: Date;
    caseNumber?: string;
    sources: Source[];
    rawData?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

### 3. JavaScript 版本的入口點

**檔案位置：** `src/index.js`

這是舊版的 JavaScript 入口點，應該使用 TypeScript 版的 `index.ts` 替代。

## 解決方案建議

### 1. 移除或隔離舊版資料庫相關代碼

- **獨立遷移工具**：將 `migration.ts` 移至獨立的工具目錄，如 `tools/migration`
- **移除舊版 JS 檔案**：刪除 `offenderRecord.js` 和 `index.js` 等舊版檔案
- **添加正確型別定義**：確保所有資料庫操作有正確的 TypeScript 型別

### 2. 完成 Knex.js 的整合

- 將資料庫查詢重構為使用 Knex.js
- 建立資料遷移和種子檔案
- 實現完整的資料庫操作層

### 3. 更新專案配置

- 更新 `package.json` 依賴，移除不再需要的舊版套件
- 配置 Knex.js CLI 工具
- 更新啟動腳本以使用 Bun 原生 HTTP 伺服器
