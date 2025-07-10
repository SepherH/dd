# Memory 使用指南

## 目錄
- [簡介](#簡介)
- [基本概念](#基本概念)
- [使用時機](#使用時機)
- [最佳實踐](#最佳實踐)
- [常見問答](#常見問答)
- [進階功能](#進階功能)

## 簡介
Memory 是 Windsurf 提供的一個知識圖譜式持久化記憶系統，用於保存和組織專案相關的重要資訊。本指南將介紹如何在專案中有效使用 Memory 功能。

## 基本概念

### 1. 記憶類型
- **專案記憶**：與專案相關的技術細節、架構決策等
- **代碼記憶**：重要的代碼片段、函數說明等
- **對話記憶**：重要的討論和決策記錄

### 2. 記憶結構
每條記憶包含：
- **標題**：簡潔描述記憶內容
- **內容**：詳細資訊
- **標籤**：用於分類和檢索
- **關聯**：與其他記憶的關係

## 使用時機

### 1. 記錄技術決策
```markdown
標題：選擇 MariaDB 作為主要資料庫
內容：
- 原因：需要穩定的事務支援和良好的查詢效能
- 版本：10.6
- 配置：InnoDB 儲存引擎，UTF-8 編碼
標籤：database, decision, architecture
```

### 2. 保存代碼片段
```typescript
// 標題：資料庫連線池配置
// 標籤：database, connection, config
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});
```

### 3. 記錄問題解決方案
```markdown
## 問題：Bun 模組導入錯誤

### 錯誤訊息
`Cannot find module 'bun'`

### 解決方案
使用內聯類型定義：
```typescript
type Serve = typeof Bun.serve extends (options: infer T) => any ? T : never;
```

### 相關文件
- [Bun 文檔](https://bun.sh/docs)
- [TypeScript 條件類型](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
```

## 最佳實踐

### 1. 命名規範
- 使用明確的描述性標題
- 包含相關的技術關鍵字
- 使用一致的命名格式

### 2. 標籤使用
- 使用小寫字母
- 使用連字符連接多個單詞
- 避免使用特殊字符

### 3. 內容組織
- 保持內容簡潔明瞭
- 使用 Markdown 格式化
- 包含相關代碼範例

## 常見問答

### Q: 記憶會佔用多少儲存空間？
A: 記憶資料會經過壓縮和最佳化，通常不會佔用太多空間。

### Q: 如何搜尋特定的記憶？
A: 可以使用標籤或關鍵字進行搜尋。

### Q: 記憶會同步到其他裝置嗎？
A: 是的，記憶會與 Windsurf 帳號同步。

## 進階功能

### 1. 記憶關聯
可以建立記憶之間的關聯，例如：
- 問題與解決方案
- 功能與相關代碼
- 決策與影響分析

### 2. 自動化整合
可以與 CI/CD 流程整合，自動記錄：
- 部署記錄
- 測試結果
- 效能指標

### 3. 團隊協作
- 共享記憶給團隊成員
- 追蹤記憶的變更歷史
- 討論和評論功能

## 附錄

### 常用標籤參考
- `bug`: 錯誤修復
- `enhancement`: 功能增強
- `documentation`: 文件更新
- `performance`: 效能優化
- `refactor`: 代碼重構
- `database`: 資料庫相關
- `api`: API 相關
- `test`: 測試相關

### 相關資源
- [Windsurf 官方文檔](https://docs.windsurf.com)
- [Markdown 語法指南](https://www.markdownguide.org/)
- [TypeScript 手冊](https://www.typescriptlang.org/docs/)
