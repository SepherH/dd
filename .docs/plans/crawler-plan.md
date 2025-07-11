# 臺中市交通事件裁決處酒駕累犯資料爬取計劃

## 已完成工作

1. **基礎爬蟲架構**
   - 建立爬蟲基礎架構，支持從臺中市交通事件裁決處網站抓取酒駕累犯資料
   - 實現分頁處理，先從主頁獲取資料頁面連結，再從資料頁面獲取PDF連結
   - 支持下載和保存PDF檔案

2. **資料分類存儲**
   - 建立原始資料存儲目錄 `data/raw_pdfs`
   - 根據年月自動分類PDF檔案到 `data/processed/{年份}年{月份}` 目錄
   - 預留 `data/extracted` 目錄用於存儲解析後的結構化資料

## 下一步工作

1. **PDF 解析優化**
   - 優化現有的 `read_pdf.py` 腳本，支持批量處理下載的PDF檔案
   - 改進PDF文本提取邏輯，處理表格結構和跨頁內容
   - 集成 OCR 功能，應對無法直接提取文本的掃描版PDF

2. **資料結構化與清洗**
   - 完善 OpenAI API 集成，用於解析複雜的文本內容
   - 實現酒駕資料的標準化處理，包括日期、地址、違規條款等
   - 開發資料去重和資料驗證機制

3. **資料庫整合**
   - 設計並實現資料庫模型
   - 開發資料匯入腳本，將解析後的結構化資料存入資料庫
   - 建立資料更新機制，支持增量更新

4. **爬蟲自動化**
   - 設置定期執行的排程任務
   - 實現自動增量更新，只處理新發布的資料
   - 添加錯誤處理和通知機制

5. **擴展至其他監理所**
   - 基於現有架構，擴展支持其他監理所網站的資料爬取
   - 開發通用的爬蟲策略模式，減少重複代碼

## 技術挑戰與解決方案

1. **網站結構變化**
   - **挑戰**：網站可能隨時變更結構或資料發布方式
   - **解決方案**：建立健壯的選擇器策略，盡可能使用語義化標記，實現自適應爬取

2. **PDF格式差異**
   - **挑戰**：不同時期發布的PDF格式可能不一致
   - **解決方案**：使用OpenAI API輔助理解不同格式，建立多種PDF解析策略

3. **資料完整性**
   - **挑戰**：確保所有資料被正確提取和解析
   - **解決方案**：實現多重驗證機制，對異常資料進行標記和人工審核

4. **效能優化**
   - **挑戰**：隨著資料量增加，處理效率可能下降
   - **解決方案**：實現並行處理，優化資料庫查詢，使用緩存減少重複計算

## 專案時程

1. **第一階段**：基礎爬蟲與資料獲取（已完成）
   - 建立爬蟲架構
   - 實現PDF下載與分類

2. **第二階段**：資料處理與結構化（1-2週）
   - 完善PDF解析
   - 實現資料清洗和標準化

3. **第三階段**：資料庫與API（2週）
   - 設計並實現資料庫
   - 開發基本的API端點

4. **第四階段**：自動化與監控（1週）
   - 實現定期爬取
   - 開發監控與報警機制

5. **第五階段**：擴展與優化（持續）
   - 擴展至其他監理所
   - 基於用戶反饋進行優化
