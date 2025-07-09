#!/bin/bash

# 酒駕累犯名單整合平台 - 開發會話初始化腳本
# 用法: ./start-session.sh [模式]
# 模式可選參數: dev, prod, test (預設為 dev)

# 顯示標題
echo "========================================"
echo "酒駕累犯名單整合平台 - 開發會話初始化"
echo "========================================"

# 設定環境變數
MODE=${1:-dev}

echo "設定環境為: $MODE"

# 確保 .ai 資料夾存在
if [ ! -d "$(dirname "$0")/../" ]; then
  mkdir -p "$(dirname "$0")/../"
  echo "已建立 .ai 資料夾"
fi

# 檢查 plan.md 檔案是否存在
if [ ! -f "$(dirname "$0")/../plan.md" ]; then
  echo "警告: plan.md 檔案不存在，建議運行 AI 助手初始化它"
fi

# 檢查 .env 檔案
if [ ! -f "$(dirname "$0")/../../.env" ]; then
  echo "警告: .env 檔案不存在，將建立範例檔案"
  cat > "$(dirname "$0")/../../.env.example" << EOF
# 資料庫設定
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=offender_records

# OpenAI API 金鑰
OPENAI_API_KEY=your_openai_api_key

# 伺服器設定
PORT=3000
NODE_ENV=$MODE
EOF
  echo "已建立 .env.example 檔案，請複製為 .env 並填入適當的值"
fi

# 顯示提示信息
echo ""
echo "========================================"
echo "請在 AI 助手中使用以下指令開始開發會話："
echo "使用 .ai/project-settings.md 繼續專案"
echo "========================================"
echo ""
echo "或者直接複製下面的完整指令："
echo "-------------------------"
echo "使用 .ai/project-settings.md 繼續專案，我正在進行酒駕累犯名單整合平台的開發，目前正在將系統從 Express/MongoDB 遷移到 Bun 原生 HTTP 伺服器和 MariaDB (使用 Knex.js)。"
echo "-------------------------"
echo ""
