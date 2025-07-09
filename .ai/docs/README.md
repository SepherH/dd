# 酒駕累犯名單整合平台文件索引

本目錄包含酒駕累犯名單整合平台的所有技術文件、專案計畫和討論記錄。

## 文件組織結構

### 專案基礎文件 (`project/`)
- [專案計畫](project/plan.md) - 整體專案規劃和里程碑
- [專案結構](project/structure.md) - 程式碼組織和架構說明
- [專案設定](project/settings.md) - 環境配置和相關設定

### 技術文件 (`technical/`)

#### 資料庫相關 (`technical/database/`)
- [MariaDB 匯入和連接修復](technical/database/mariadb-import-fixes-20250709.md) - 資料匯入流程和連接處理改進

#### 爬蟲相關 (`technical/crawler/`)
- [臺中市交通事件裁決處爬蟲成果](technical/crawler/taichung-dui-crawler-achievements.md) - 爬蟲實作和成果記錄

### 討論與會議記錄 (`../discussions/`)
- [2025-07-08 除錯與啟動問題解決](../discussions/2025-07-08-除錯與啟動問題解決.md)
- [2025-07-09 OpenAI API 金鑰設定與測試](../discussions/2025-07-09-OpenAI-API-金鑰設定與測試.md)
- [2025-07-09 爬蟲分析-臺中市交通事件裁決處](../discussions/2025-07-09-爬蟲分析-臺中市交通事件裁決處.md)
- [2025-07-09 資料庫設定與遷移記錄](../discussions/2025-07-09-資料庫設定與遷移記錄.md)

## 文件編寫指南

1. **命名規範**：
   - 檔案名稱使用小寫英文，用連字符號（-）連接單字
   - 討論記錄使用 `YYYY-MM-DD-主題.md` 格式命名

2. **文件格式**：
   - 使用 Markdown 格式
   - 使用4個空格作為縮排（不使用 Tab）
   - 代碼區塊應指明程式語言（如 ```typescript）

3. **內容組織**：
   - 每個文件應該有一個明確的標題（# 開頭）
   - 使用適當的標題層級（#, ##, ###）來組織內容
   - 如有代碼示例，應提供充分的註釋
