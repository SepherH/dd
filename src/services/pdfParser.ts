import * as pdfjsLib from 'pdfjs-dist';
import fs from 'fs/promises';
import path from 'path';

// 設置 PDF.js worker 路徑
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * 從 PDF 檔案中提取文本內容
 * @param filePath PDF 檔案路徑
 * @returns 提取的文本內容
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    // 讀取 PDF 檔案
    const data = await fs.readFile(filePath);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // 遍歷每一頁
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => {
        // 處理文本項目
        if ('str' in item) {
          return item.str;
        }
        return '';
      });
      
      fullText += strings.join('\n') + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error(`解析 PDF 失敗 (${filePath}):`, error);
    throw error;
  }
}

/**
 * 解析酒駕累犯資料
 * @param text PDF 提取的文本內容
 * @returns 結構化的酒駕累犯資料
 */
export function parseOffenderData(text: string): any[] {
  // 分割成行
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const offenders = [];
  
  // 臨時變量來儲存當前處理的違規者資料
  let currentOffender: any = null;
  
  for (const line of lines) {
    // 檢查是否為新的一筆資料（序號開頭）
    const newRecordMatch = line.match(/^\s*(\d+)\s+/);
    
    if (newRecordMatch) {
      // 如果已經有處理中的違規者，先儲存
      if (currentOffender) {
        offenders.push(currentOffender);
      }
      
      // 開始新的違規者資料
      currentOffender = {
        id: parseInt(newRecordMatch[1], 10),
        name: '',
        violationDate: '',
        violationArticle: '',
        violationLocation: '',
        violationDescription: '',
        hasPhoto: false
      };
      
      // 移除序號部分，處理剩餘的文本
      const remainingText = line.substring(newRecordMatch[0].length).trim();
      
      // 嘗試從剩餘文本中提取姓名
      const nameMatch = remainingText.match(/^([^\d]+?)\s*\d{2,3}\/\d{1,2}\/\d{1,2}/);
      if (nameMatch) {
        currentOffender.name = nameMatch[1].trim();
      }
      
      // 嘗試提取違規日期
      const dateMatch = remainingText.match(/(\d{2,3}\/\d{1,2}\/\d{1,2})/);
      if (dateMatch) {
        currentOffender.violationDate = dateMatch[1];
      }
      
      // 檢查是否包含照片標記
      if (line.includes('照片') || line.includes('相片')) {
        currentOffender.hasPhoto = true;
      }
    } else if (currentOffender) {
      // 如果不是新紀錄，則將行添加到違規描述中
      if (line.includes('第') && line.includes('條')) {
        currentOffender.violationArticle = line.trim();
      } else if (line.includes('區') || line.includes('路') || line.includes('街') || line.includes('段')) {
        currentOffender.violationLocation = line.trim();
      } else if (line.includes('酒') || line.includes('酒精') || line.includes('駕駛')) {
        currentOffender.violationDescription = line.trim();
      }
    }
  }
  
  // 添加最後一筆資料
  if (currentOffender) {
    offenders.push(currentOffender);
  }
  
  return offenders;
}

/**
 * 處理單個 PDF 檔案
 * @param filePath PDF 檔案路徑
 * @returns 解析後的酒駕累犯資料
 */
export async function processPdfFile(filePath: string): Promise<any[]> {
  try {
    console.log(`正在處理 PDF 檔案: ${filePath}`);
    
    // 提取文本
    const text = await extractTextFromPdf(filePath);
    
    // 解析資料
    const offenders = parseOffenderData(text);
    
    console.log(`從 ${path.basename(filePath)} 中解析出 ${offenders.length} 筆資料`);
    return offenders;
  } catch (error) {
    console.error(`處理 PDF 檔案失敗 (${filePath}):`, error);
    return [];
  }
}

/**
 * 處理目錄中的所有 PDF 檔案
 * @param directory 目錄路徑
 * @returns 所有解析出的酒駕累犯資料
 */
export async function processPdfDirectory(directory: string): Promise<any[]> {
  try {
    const files = await fs.readdir(directory);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    console.log(`在目錄 ${directory} 中找到 ${pdfFiles.length} 個 PDF 檔案`);
    
    let allOffenders: any[] = [];
    
    // 處理每個 PDF 檔案
    for (const file of pdfFiles) {
      const filePath = path.join(directory, file);
      const offenders = await processPdfFile(filePath);
      allOffenders = [...allOffenders, ...offenders];
    }
    
    return allOffenders;
  } catch (error) {
    console.error(`處理 PDF 目錄失敗 (${directory}):`, error);
    return [];
  }
}
