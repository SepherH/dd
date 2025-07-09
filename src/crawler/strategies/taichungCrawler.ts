/**
 * 臺中市交通事件裁決處酒駕累犯資料爬蟲策略
 */

import { TaichungDuiCrawler } from '../taichungDuiCrawler';

/**
 * 爬取臺中市交通事件裁決處的酒駕及拒測累犯資料
 * @param url 台中市交通事件裁決處的網址
 * @returns 爬取的原始數據陣列
 */
export async function taichungCrawler(url: string): Promise<any[]> {
  console.log(`開始執行臺中市交通事件裁決處爬蟲 (${url})`);
  
  try {
    const crawler = new TaichungDuiCrawler();
    
    // 獲取主頁面
    const html = await crawler.fetchMainPage();
    
    // 提取PDF連結
    const pdfLinks = crawler.extractPdfLinks(html);
    if (pdfLinks.length === 0) {
      console.log('沒有找到PDF連結，任務終止');
      return [];
    }
    
    // 下載所有PDF
    const downloadedFiles = await crawler.downloadAllPdfs(pdfLinks);
    
    // 分類PDF
    if (downloadedFiles.length > 0) {
      await crawler.categorizePdfs();
    }
    
    console.log('臺中市交通事件裁決處爬蟲完成!');
    
    // 返回下載的檔案路徑，可供後續處理
    return downloadedFiles.map(filePath => ({ filePath }));
  } catch (error) {
    console.error('臺中市交通事件裁決處爬蟲執行失敗:', error);
    return [];
  }
}
