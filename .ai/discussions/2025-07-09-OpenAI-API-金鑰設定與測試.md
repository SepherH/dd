# OpenAI API 金鑰設定與測試記錄

> 日期：2025-07-09

## 1. 概述

本文記錄了酒駕累犯名單整合平台專案中 OpenAI API 金鑰的設定與測試過程。此次作業主要完成了以下工作：

1. 設定 OpenAI API 金鑰環境變數
2. 測試 AI 服務模組
3. 驗證文字結構化與語言檢測功能

## 2. API 金鑰設定

已將 OpenAI API 金鑰設定到專案的 `.env` 檔案中：

```env
# OpenAI API 金鑰
OPENAI_API_KEY=sk-xxxx...xxxx  # 實際金鑰已隱藏，請使用自己的有效金鑰
```

這是一個專案 API 金鑰，用於呼叫 OpenAI 服務，支援 GPT-4 和其他相關模型。

## 3. API 測試結果

我們使用測試腳本 `src/scripts/testOpenAI.ts` 進行了 API 功能測試。測試結果顯示 API 金鑰運作正常，所有功能均可使用：

### 3.1 API 初始化

API 金鑰成功初始化 OpenAI 客戶端：

```
[INFO] 成功初始化 OpenAI 客戶端
```

### 3.2 文字結構化測試

測試了將法院裁決書轉換為結構化資料的功能，成功從文本中提取了當事人資訊：

```json
[
  {
    "姓名": "潘冠宏",
    "性別": null,
    "身分證字號/車牌號碼": null,
    "違規日期": null,
    "裁決字號": "112年度司促字第15613號"
  },
  {
    "姓名": "張俊傑",
    "性別": null,
    "身分證字號/車牌號碼": null,
    "違規日期": null,
    "裁決字號": "112年度司促字第15613號"
  }
]
```

### 3.3 語言檢測測試

成功檢測到文本語言為繁體中文：

```
[INFO] 語言檢測結果: zh-tw
```

## 4. 已修復的問題

之前系統在缺少 OpenAI API 金鑰時會直接拋出錯誤導致伺服器無法啟動。現在我們已經修復了這個問題：

1. 在 `src/services/aiService.ts` 中實現了容錯處理
2. 新增了模擬模式，當 API 金鑰不可用時返回模擬資料
3. 增加了 `isOpenAiAvailable` 狀態追蹤，確保系統在 API 不可用時仍能運行

## 5. 功能確認

經過測試，確認以下 AI 功能正常運作：

- ✅ OpenAI 客戶端初始化
- ✅ 文字結構化處理
- ✅ 語言檢測
- ✅ 模擬模式正常運作 (當 API 不可用時)

## 6. 下一步工作

接下來我們可以進行以下工作：

1. 優化 AI 服務的結構化處理能力，提高對法院文件的解析準確度
2. 實現批次處理功能，支援多文件同時處理
3. 擴展 AI 服務，增加更多功能，例如情感分析、關鍵信息提取等
4. 建立 API 使用追蹤與計費監控機制

## 7. 注意事項

- API 金鑰是敏感資訊，已確保在 `.env` 檔案中，並已將 `.env` 加入到 `.gitignore`，防止金鑰外洩
- 建議設定請求速率限制，避免超出 API 使用配額
- 在生產環境部署時，建議使用環境變數注入金鑰，而非直接寫入檔案
