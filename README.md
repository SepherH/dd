# 酒駕累犯名單整合平台

## 專案概述

這個專案旨在建立一個統一的酒駕累犯名單整合平台，從各監理所網站爬取相關資料，使用 AI 技術整理表單和圖片資料，並提供開放 API 接口。

## 主要功能

1. **自動化爬蟲**：定期從各監理所網站抓取最新的酒駕累犯資料
2. **AI 資料處理**：使用 OpenAI API 處理和結構化表單及圖片中的資料
3. **資料庫存儲**：將整理後的資料存入資料庫
4. **RESTful API**：提供開放 API 接口供第三方應用程式使用

## 技術堆疊

- **執行環境**：Node.js + Bun
- **資料庫**：MongoDB
- **爬蟲**：Axios + Cheerio
- **任務排程**：Cron
- **API 框架**：Express
- **AI 處理**：OpenAI API

## 快速開始

### 安裝相依套件

```bash
bun install
```

### 設定環境變數

複製 `.env.example` 檔案並重命名為 `.env`，然後填入必要的環境變數：

```bash
cp .env.example .env
```

### 啟動專案

```bash
# 開發模式
bun dev

# 生產模式
bun start

# 只運行爬蟲
bun crawler
```

## 專案結構

```
專案根目錄
├── src/                 # 主要程式碼
│   ├── crawler/         # 爬蟲相關程式碼
│   ├── api/             # API 接口程式碼
│   ├── models/          # 資料模型
│   └── services/        # 服務層程式碼
├── config/              # 配置文件
├── data/                # 暫存的數據
└── tests/               # 測試程式碼
```

## API 文件

待開發完成後補充。

## 參與貢獻

1. Fork 這個專案
2. 建立您的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟一個 Pull Request

## 授權

此專案採用 MIT 授權 - 詳情請查看 [LICENSE](LICENSE) 文件。
