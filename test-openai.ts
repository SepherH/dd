import { OpenAIService } from './src/services/openaiService';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// 測試 OpenAI 服務的功能
async function main() {
  console.log('開始測試 OpenAI 服務...');

  // 嘗試從環境變數獲取 API 金鑰，如沒有則使用模擬模式
  const apiKey = process.env.OPENAI_API_KEY;
  const useSimulation = !apiKey;
  
  if (useSimulation) {
    console.log('未找到 API 金鑰，將使用模擬模式運行');
  } else {
    console.log('找到 API 金鑰，將使用實際 API 運行');
  }

  // 創建 OpenAI 服務實例
  const service = new OpenAIService(apiKey, useSimulation);

  // 1. 測試 PDF 文本解析
  console.log('\n1. 測試 PDF 文本解析:');
  const pdfText = await fs.readFile('./taichung_dui_list.pdf', 'utf8').catch(() => {
    console.log('無法讀取 PDF 文件，使用樣本數據代替');
    return `
序號 姓名 違規日 違規條款 違規地點 違規事實 照片
1 石玉山 111/7/11 第35條第3項 沙鹿區中清路六段489號汽機車駕駛人駕駛汽機車，於十年內
酒精濃度超過規定標準第2次(無照)
2 楊朝明 112/4/2 第35條第3項 梧棲區中央路二段540號汽機車駕駛人駕駛汽機車，於十年內
酒精濃度超過規定標準第2次
3 黃銀柏 111/7/31 第35條第3項 大肚區王福街326號前汽機車駕駛人駕駛汽機車，於十年內
酒精濃度超過規定標準第2次
    `;
  });
  
  const parsedData = await service.extractStructuredDataFromPDF(pdfText);
  console.log('PDF 解析結果:', JSON.stringify(parsedData, null, 2));

  // 2. 測試網頁鏈接提取
  console.log('\n2. 測試網頁鏈接提取:');
  const url = 'https://www.traffic.taichung.gov.tw/unit/form/index.asp?Parser=2,18,591';
  
  try {
    const response = await axios.get(url);
    const htmlContent = response.data;
    
    console.log(`已獲取網頁內容，長度: ${htmlContent.length} 字符`);
    const pdfLinks = await service.extractPDFLinksFromHTML(htmlContent);
    
    console.log('找到 PDF 鏈接:', pdfLinks);
    
    // 如果找到鏈接，嘗試下載第一個 PDF
    if (pdfLinks.length > 0) {
      const firstPdfUrl = pdfLinks[0];
      console.log(`\n嘗試下載 PDF: ${firstPdfUrl}`);
      
      try {
        const pdfResponse = await axios.get(firstPdfUrl, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(pdfResponse.data);
        
        const outputPath = './downloaded_sample.pdf';
        await fs.writeFile(outputPath, pdfBuffer);
        console.log(`已下載 PDF 到: ${outputPath}`);
      } catch (error) {
        console.error('下載 PDF 失敗:', error.message);
      }
    }
  } catch (error) {
    console.error('獲取網頁內容失敗:', error.message);
  }

  console.log('\n測試完成!');
}

// 執行主函數
main().catch(err => console.error('測試過程中發生錯誤:', err));
