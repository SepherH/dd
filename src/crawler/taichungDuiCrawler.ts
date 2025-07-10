import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { processPdfFile } from '../services/pdfParser';
import { saveOffendersToDatabase } from '../services/databaseService';

/**
 * 臺中市交通事件裁決處酒駕累犯資料爬蟲
 */
export class TaichungDuiCrawler {
  private baseUrl = 'https://www.traffic.taichung.gov.tw/unit/form/index.asp?Parser=2,18,591';
  private baseHost = 'https://www.traffic.taichung.gov.tw';
  private rawPdfsDir = path.resolve(process.cwd(), 'data/raw_pdfs');
  private processedDir = path.resolve(process.cwd(), 'data/processed');
  private extractedDir = path.resolve(process.cwd(), 'data/extracted');
  private sourceName = 'taichung_traffic_bureau';

  /**
   * 初始化爬蟲
   */
  constructor() {
    this.ensureDirectoriesExist();
  }

  /**
   * 確保必要的目錄存在
   */
  private async ensureDirectoriesExist() {
    try {
      await fs.mkdir(this.rawPdfsDir, { recursive: true });
      await fs.mkdir(this.processedDir, { recursive: true });
      await fs.mkdir(this.extractedDir, { recursive: true });
      console.log('目錄結構已確認');
    } catch (error) {
      console.error('建立目錄失敗:', error);
    }
  }

  /**
   * 獲取主頁面的HTML內容
   */
  async fetchMainPage(): Promise<string> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('獲取主頁面失敗:', error);
      throw error;
    }
  }

  /**
   * 從主頁面HTML內容中提取資料頁面連結
   * @param html HTML內容
   */
  extractDataPageLinks(html: string): { url: string; title: string }[] {
    try {
      const $ = cheerio.load(html);
      const dataPageLinks: { url: string; title: string }[] = [];

      // 尋找所有包含酒駕或拒測關鍵字的連結
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text();
        
        // 檢查連結是否包含相關關鍵字
        if (href && text && 
            (text.includes('酒') || text.includes('毒') || text.includes('拒測') || text.includes('累犯')) &&
            href.includes('index-1.asp')) {
          
          // 轉換為完整URL
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = new URL(href, this.baseHost).toString();
          } else if (!href.startsWith('http')) {
            fullUrl = new URL(href, this.baseHost + '/unit/form/').toString();
          }
          
          dataPageLinks.push({
            url: fullUrl,
            title: text.trim()
          });
        }
      });

      console.log(`找到 ${dataPageLinks.length} 個資料頁面連結`);
      return dataPageLinks;
    } catch (error) {
      console.error('提取資料頁面連結失敗:', error);
      return [];
    }
  }
  
  /**
   * 從資料頁面內容中提取PDF連結
   * @param html HTML內容
   */
  extractPdfLinks(html: string): string[] {
    try {
      const $ = cheerio.load(html);
      const pdfLinks: string[] = [];

      // 尋找所有指向PDF的連結
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text();
        
        // 檢查連結是否指向PDF
        if (href && (
            href.toLowerCase().endsWith('.pdf') || 
            href.toLowerCase().includes('.pdf') ||
            href.toLowerCase().includes('getfile')
        )) {
          
          // 轉換為完整URL
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = new URL(href, this.baseHost).toString();
          } else if (!href.startsWith('http')) {
            fullUrl = new URL(href, this.baseHost + '/unit/').toString();
          }
          
          pdfLinks.push(fullUrl);
        }
      });

      // 也嘗試從iframe中尋找PDF連結
      $('iframe').each((_, element) => {
        const src = $(element).attr('src');
        if (src && src.toLowerCase().includes('.pdf')) {
          let fullUrl = src;
          if (src.startsWith('/')) {
            fullUrl = new URL(src, this.baseHost).toString();
          } else if (!src.startsWith('http')) {
            fullUrl = new URL(src, this.baseHost + '/unit/').toString();
          }
          
          pdfLinks.push(fullUrl);
        }
      });
      
      console.log(`找到 ${pdfLinks.length} 個PDF連結`);
      return pdfLinks;
    } catch (error) {
      console.error('提取PDF連結失敗:', error);
      return [];
    }
  }
  
  /**
   * 獲取資料頁面的HTML內容
   * @param url 資料頁面URL
   */
  async fetchDataPage(url: string): Promise<string> {
    try {
      console.log(`正在訪問資料頁面: ${url}`);
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`獲取資料頁面失敗 (${url}):`, error);
      return '';
    }
  }

  /**
   * 下載PDF檔案
   * @param url PDF檔案的URL
   * @param title 標題（用於檔案命名）
   * @returns 檔案儲存路徑或null（如果下載失敗）
   */
  async downloadPdf(url: string, title: string = ''): Promise<string | null> {
    try {
      // 從URL中獲取檔案名稱，並進行清理
      let fileName = url.split('/').pop() || '';
      fileName = decodeURIComponent(fileName).replace(/[?#].*/g, '');
      
      // 如果檔案名稱不是PDF結尾，添加副檔名
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      }
      
      // 使用標題和時間戳命名檔案，以避免重複
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let sanitizedTitle = '';
      
      if (title) {
        sanitizedTitle = title.replace(/[\/:*?"<>|]/g, '_') + '_';
      }
      
      const filePath = path.join(this.rawPdfsDir, `${sanitizedTitle}${timestamp}_${fileName}`);
      
      console.log(`正在下載: ${url} 到 ${filePath}`);
      
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        timeout: 30000, // 30秒超時
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': this.baseUrl
        }
      });
      
      await fs.writeFile(filePath, Buffer.from(response.data));
      console.log(`已下載: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error(`下載PDF失敗 (${url}):`, error);
      return null;
    }
  }

  /**
   * 下載所有找到的PDF檔案
   * @param urls PDF檔案URL陣列
   */
  async downloadAllPdfs(urls: string[]): Promise<string[]> {
    console.log(`開始下載 ${urls.length} 個PDF檔案...`);
    
    const downloadPromises = urls.map(url => this.downloadPdf(url));
    const results = await Promise.all(downloadPromises);
    
    // 過濾掉下載失敗的結果
    const successfulDownloads = results.filter(Boolean) as string[];
    
    console.log(`成功下載 ${successfulDownloads.length} 個PDF檔案，${urls.length - successfulDownloads.length} 個失敗`);
    return successfulDownloads;
  }

  /**
   * 分類下載的PDF檔案（根據年份和月份）
   */
  async categorizePdfs(): Promise<void> {
    try {
      // 讀取raw_pdfs目錄中的所有檔案
      const files = await fs.readdir(this.rawPdfsDir);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
      
      for (const file of pdfFiles) {
        // 嘗試從檔名中提取日期信息
        const dateMatch = file.match(/(1\d{2})年(\d{1,2})月(\d{1,2})日/);
        
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          
          // 建立以年月為名的目錄
          const yearMonthDir = path.join(this.processedDir, `${year}年${month}月`);
          await fs.mkdir(yearMonthDir, { recursive: true });
          
          // 複製檔案到分類目錄
          const sourcePath = path.join(this.rawPdfsDir, file);
          const targetPath = path.join(yearMonthDir, file);
          
          await fs.copyFile(sourcePath, targetPath);
          console.log(`已將 ${file} 分類至 ${year}年${month}月 目錄`);
        } else {
          console.log(`無法從 ${file} 中提取日期資訊，保留在原始目錄`);
        }
      }
      
      console.log('PDF檔案分類完成');
    } catch (error) {
      console.error('PDF檔案分類失敗:', error);
    }
  }

  /**
   * 處理下載的 PDF 檔案，解析並存入資料庫
   */
  private async processDownloadedPdfs(filePaths: string[]): Promise<void> {
    console.log(`開始處理 ${filePaths.length} 個 PDF 檔案...`);
    
    let allOffenders: any[] = [];
    
    for (const filePath of filePaths) {
      try {
        // 解析 PDF 檔案
        const offenders = await processPdfFile(filePath);
        
        if (offenders && offenders.length > 0) {
          allOffenders = [...allOffenders, ...offenders];
          console.log(`已從 ${path.basename(filePath)} 解析出 ${offenders.length} 筆資料`);
        }
      } catch (error) {
        console.error(`處理檔案 ${filePath} 時發生錯誤:`, error);
      }
    }
    
    // 將解析出的資料存入資料庫
    if (allOffenders.length > 0) {
      console.log(`準備將 ${allOffenders.length} 筆資料存入資料庫...`);
      await saveOffendersToDatabase(allOffenders, this.sourceName);
    } else {
      console.log('沒有解析出任何有效的資料');
    }
  }
  
  /**
   * 執行完整的爬蟲流程
   */
  async run(): Promise<void> {
    try {
      // 獲取主頁面
      console.log('開始爬取臺中市交通事件裁決處酒駕累犯資料...');
      const html = await this.fetchMainPage();
      
      // 提取資料頁面連結
      const dataPageLinks = this.extractDataPageLinks(html);
      if (dataPageLinks.length === 0) {
        console.log('沒有找到資料頁面連結，任務終止');
        return;
      }
      
      console.log(`開始處理 ${dataPageLinks.length} 個資料頁面...`);
      
      let allPdfLinks: { url: string; title: string }[] = [];
      
      // 針對每個資料頁面，獲取其HTML內容並提取PDF連結
      for (let i = 0; i < Math.min(dataPageLinks.length, 3); i++) { // 限制處理前3個，避免過多請求
        const { url, title } = dataPageLinks[i];
        console.log(`處理資料頁面: ${title} (${url})`);
        
        const dataPageHtml = await this.fetchDataPage(url);
        
        if (dataPageHtml) {
          const pdfLinks = this.extractPdfLinks(dataPageHtml);
          
          for (const pdfUrl of pdfLinks) {
            allPdfLinks.push({
              url: pdfUrl,
              title: `${title}_${path.basename(pdfUrl)}`
            });
          }
          
          console.log(`從 ${title} 找到 ${pdfLinks.length} 個 PDF 連結`);
        }
      }
      
      // 如果沒有找到任何PDF連結，直接下載資料頁面HTML作為備份
      if (allPdfLinks.length === 0) {
        console.log('沒有找到PDF連結，將下載資料頁面HTML作為備份');
        
        for (let i = 0; i < Math.min(dataPageLinks.length, 2); i++) {
          const { url, title } = dataPageLinks[i];
          const sanitizedTitle = title.replace(/[\/:*?"<>|]/g, '_');
          const htmlPath = path.join(this.rawPdfsDir, `${sanitizedTitle}.html`);
          
          const dataPageHtml = await this.fetchDataPage(url);
          if (dataPageHtml) {
            await fs.writeFile(htmlPath, dataPageHtml);
            console.log(`已保存HTML: ${htmlPath}`);
          }
        }
        
        console.log('爬蟲任務完成! (HTML模式)');
        return;
      }
      
      console.log(`找到 ${allPdfLinks.length} 個PDF連結，開始下載...`);
      
      // 下載所有PDF
      const downloadedFiles: string[] = [];
      
      // 限制同時下載的檔案數量，避免過多請求
      const MAX_CONCURRENT_DOWNLOADS = 2;
      
      for (let i = 0; i < allPdfLinks.length; i += MAX_CONCURRENT_DOWNLOADS) {
        const batch = allPdfLinks.slice(i, i + MAX_CONCURRENT_DOWNLOADS);
        const batchResults = await Promise.all(
          batch.map(({ url, title }) => this.downloadPdf(url, title))
        );
        
        const successfulDownloads = batchResults.filter(Boolean) as string[];
        downloadedFiles.push(...successfulDownloads);
        
        // 處理已下載的檔案
        if (successfulDownloads.length > 0) {
          await this.processDownloadedPdfs(successfulDownloads);
        }
        
        // 添加延遲，避免觸發反爬蟲機制
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 分類PDF
      if (downloadedFiles.length > 0) {
        await this.categorizePdfs();
      }
      
      console.log('爬蟲任務完成! 所有資料已處理並存入資料庫。');
    } catch (error) {
      console.error('爬蟲執行失敗:', error);
    }
  }
}

// 用於直接執行的函數
export async function runTaichungDuiCrawler() {
  const crawler = new TaichungDuiCrawler();
  await crawler.run();
}

// 如果直接執行此檔案，則啟動爬蟲
if (require.main === module) {
  runTaichungDuiCrawler().catch(console.error);
}
