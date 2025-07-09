# 酒駕累犯名單整合平台 - 專案計劃

## 專案概述
建立一個統一的酒駕累犯名單整合平台，從各個監理所網站爬取相關資料，使用 AI 技術整理表單和圖片資料，並提供開放 API 接口。

## 目標
1. 建立自動化爬蟲系統，定期從各監理所網站獲取最新酒駕累犯資料
2. 利用 OpenAI API 處理和結構化表單及圖片中的資料
3. 建立資料庫存儲整理後的資料
4. 提供 RESTful API 接口供第三方應用程式使用

## 技術堆疊
- 執行環境：Node.js + Bun + TypeScript
- 資料庫：MariaDB
- 資料庫套件：Knex.js
- 爬蟲：Axios + Cheerio
- 任務排程：Cron
- Web 伺服器：Bun 原生 HTTP 伺服器
- AI 處理：OpenAI API
- 資料驗證：Zod

## 專案進度
### 第一階段：基礎建設 (進行中)
- [x] 建立專案結構
- [x] 設定開發環境 (TypeScript + Bun)
- [x] 從 JavaScript 遷移到 TypeScript/MariaDB
- [x] 完成核心模組的 TypeScript 轉換:
  - [x] 專案配置 (tsconfig.json, package.json)
  - [x] 型別定義 (types/index.ts)
  - [x] 日誌工具 (utils/logger.ts)
  - [x] 配置工具 (utils/config.ts)
  - [x] 資料庫連接 (database/connection.ts)
  - [x] 主入口點 (index.ts)
  - [x] 爬蟲排程器 (crawler/scheduler.ts)
  - [x] 爬蟲主模組 (crawler/index.ts)
  - [x] 表格爬蟲策略 (crawler/strategies/tableCrawler.ts)
  - [x] 圖片爬蟲策略 (crawler/strategies/imageCrawler.ts)
  - [x] AI 服務模組 (services/aiService.ts)
- [x] 完成 API 相關模組的 TypeScript 轉換:
  - [x] API 路由 (api/routes.ts)
  - [x] API 控制器:
    - [x] 酒駚累犯控制器 (api/controllers/offenderController.ts)
    - [x] 統計資料控制器 (api/controllers/statisticsController.ts)
  - [x] API 中介軟體:
    - [x] 驗證中介軟體 (middlewares/auth.ts)
    - [x] 速率限制中介軟體 (middlewares/rateLimit.ts)
- [x] 設計 MariaDB 資料庫架構
  - [x] 定義主資料表結構 (offenders)
  - [x] 定義關聯資料表結構 (offender_sources)
  - [x] 定義輔助資料表 (logs, api_keys)
  - [x] 確保多語系和編碼支援 (UTF-8mb4)
- [x] 實現資料模型和查詢
  - [x] 建立 OffenderRecord 模型類別 (models/offenderRecord.ts)
  - [x] 實現 CRUD 操作方法
  - [x] 實現進階查詢和分頁功能

### 第二階段：Bun + Knex 架構遷移 (進行中)
- [x] 安裝與設定 Knex.js
  - [x] 安裝 knex 和 mysql2 套件
  - [x] 建立 knexConfig.ts 設定檔
  - [x] 建立資料庫設定工具 (tools/setupDatabase.ts)
  - [x] 建立資料表遷移檔案 (migrations/20250709_initial_schema.ts)
  - [x] 設定並連接生產環境資料庫 (59.126.99.232)
  - [x] 建立資料庫測試與遷移腳本 (scripts/testDbConnection.ts, scripts/runMigrations.ts)
  - [ ] 建立種子資料檔案
- [x] 將原有資料庫操作改用 Knex.js 實現
  - [x] 建立 Knex 版本的酒駕累犯控制器 (api/controllers/offenderControllerKnex.ts)
  - [x] 建立 Knex 版本的路由 (api/bunRoutesKnex.ts)
  - [ ] 更新其他相關的 API 控制器
- [x] 改用 Bun 原生 HTTP 伺服器
  - [x] 建立 Router 類別處理路由
  - [x] 建立中介軟體系統
  - [x] 實現 CORS、日誌記錄、JSON 處理等中介軟體
  - [x] 建立主伺服器模組
  - [x] 將 API 路由適配到 Bun HTTP 伺服器
- [x] 專案配置與依賴整理
  - [x] 更新 tsconfig.json 支援 Bun 型別
  - [x] 調整 config.ts 提供完整配置物件
  - [x] 清理舊資料庫架構殘留
    - [x] 移除 offenderRecord.js
    - [x] 移除 index.js
    - [x] 將遷移腳本移至專用工具目錄

### 第三階段：AI 整合
- [x] 整合 OpenAI API
  - [x] 設定 API 金鑰環境變數
  - [x] 測試 API 金鑰和功能
  - [x] 實現模擬模式 (當 API 不可用時使用)
- [x] 開發圖片資料解析功能
- [x] 開發文字結構化功能
- [x] 開發語言辨識功能
- [ ] 開發表單資料解析功能

### 第四階段：表單處理與資料遷移
- [x] 實現表單資料解析
  - [x] 建立表單解析服務 (services/formParser.ts)
  - [x] 實現表單驗證和清理功能
  - [x] 增加多語系內容處理支援
- [x] 整合 AI 服務與表單解析
  - [x] 實現圖像和文件文字提取
  - [x] 整合 OpenAI API 進行文字解析
  - [x] 修正 AI 服務模組的匯出/匯入問題
  - [x] 解決型別兼容性問題
- [x] 實現資料遷移工具
  - [x] 建立資料遷移腳本 (database/migration.ts)
  - [x] 支援批次處理和進度追蹤

### 第五階段：API 開發與資料庫整合
- [x] 整合 Knex.js 作為資料庫查詢建構器
  - [x] 設定 Knex 連接與配置 (database/knexConfig.ts)
  - [x] 將部分資料庫操作遷移至 Knex 查詢建構器
  - [ ] 優化查詢效能和連接池管理
- [ ] 實現 Bun 原生 HTTP 伺服器
  - [ ] 建立路由處理架構 (server/router.ts)
  - [ ] 實現中介軟體系統 (server/middleware/)
  - [ ] 設計錯誤處理機制
- [ ] 設計 RESTful API
  - [ ] 實現資料查詢和過濾功能
  - [ ] API 文件化
  - [ ] 權限控制和認證

### 第六階段：部署與優化
- [ ] 系統部署
- [ ] 效能優化
- [ ] 監控與錯誤處理

## 重要考量
1. **多語系與編碼處理**：已在爬蟲和 AI 服務模組中加入特殊處理，確保正確處理繁體中文等非英文字元
2. **資料隱私與安全**：遵守相關法規，處理敏感個人資訊
3. **系統可靠性**：確保爬蟲的穩定運行和錯誤處理
4. **資料更新頻率**：設定合理的爬蟲排程，避免對源網站造成負擔

## 待解決問題

### 已解決問題 ✅
1. ✅ 修復 router.ts 中 Bun 模組無法識別的錯誤
2. ✅ 移除舊版資料庫架構殘留代碼
   - ✅ 移除 offenderRecord.js
   - ✅ 移除 index.js
   - ✅ 將資料遷移腳本移至專用工具目錄
3. ✅ 解決伺服器啟動失敗問題
   - ✅ 處理 OpenAI API 金鑰缺失導致的錯誤
   - ✅ 增加 AI 服務的模擬模式，提供測試資料
   - ✅ 處理資料庫連線失敗但允許系統繼續運行
   - ✅ 優化錯誤處理和日誌記錄

### 待解決問題 🔄
1. 資料庫遷移尚未完成，需要編寫 Knex.js 遷移檔案
2. API 金鑰驗證和速率限制等中介軟體需要實現
3. 已開始改寫部分資料庫查詢為 Knex 查詢風格，但尚未完全完成
4. 需測試 Bun 伺服器與 Knex 控制器的整合
5. 配置環境變數以解決 OpenAI API 金鑰設定
6. 建立正確的資料庫連線設定
7. 確定各監理所網站的資料結構和更新頻率
- [ ] 評估 OpenAI API 處理表單和圖片的準確度
- [ ] 建立資料校驗機制，確保資料正確性
- [ ] 決定 API 的權限控制方案
- [ ] 轉換剩餘模組到 TypeScript:
  - [ ] API 控制器 (controllers/*)
  - [ ] API 路由 (routes/*)
  - [ ] 中間件 (middlewares/*)
  - [ ] 資料模型 (models/*)
- [ ] Knex.js 和 MariaDB 整合問題:
  - [ ] 設計適合 Knex 的查詢模式
  - [ ] 處理事務管理和批次操作
  - [ ] 優化多語系資料處理
- [ ] Bun HTTP 伺服器實現:
  - [ ] 檢測與 Express 中介軟體的兼容性
  - [ ] 設計適合 Bun 的路由結構
  - [ ] 文件上傳和處理機制

## 時程規劃
- 第一階段：2週
- 第二階段：3週
- 第三階段：2週
- 第四階段：2週

_最後更新：2025-07-08 23:22_
