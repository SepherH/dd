/**
 * 表格型態網頁的爬蟲策略
 * 
 * 專門處理以 HTML 表格形式呈現酒駕累犯資料的網頁
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';

interface RawOffenderRecord {
    [key: string]: string;
    sourceUrl?: string;
    crawlTime?: string;
}

/**
 * 爬取表格型態的監理所網頁
 * @param url 監理所網頁 URL
 * @returns 爬取到的資料陣列
 */
export async function tableCrawler(url: string): Promise<RawOffenderRecord[]> {
    try {
        logger.info(`開始爬取表格資料: ${url}`);
        
        const response = await axios({
            method: 'GET',
            url,
            timeout: parseInt(process.env.CRAWLER_TIMEOUT || '60000'),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36'
            }
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        const results: RawOffenderRecord[] = [];
        
        // 尋找可能包含酒駕累犯資料的表格
        // 這裡的選擇器需要根據實際網站結構調整
        const tables = $('table');
        
        tables.each((tableIndex, tableElement) => {
            const tableId = $(tableElement).attr('id') || `table-${tableIndex}`;
            logger.debug(`處理表格 #${tableId}`);
            
            // 檢查此表格是否為目標表格（可能需要依據特定網站調整判斷邏輯）
            const isTargetTable = checkIfTargetTable($, tableElement);
            
            if (isTargetTable) {
                // 解析表格標題行
                const headers: string[] = [];
                $(tableElement).find('tr:first-child th, tr:first-child td').each((i, el) => {
                    headers.push($(el).text().trim());
                });
                
                // 解析資料行
                $(tableElement).find('tr:not(:first-child)').each((rowIndex, row) => {
                    const rowData: RawOffenderRecord = {};
                    
                    $(row).find('td').each((colIndex, cell) => {
                        if (headers[colIndex]) {
                            rowData[headers[colIndex]] = $(cell).text().trim();
                        }
                    });
                    
                    // 檢查資料是否有效（至少包含姓名和身分證字號/車牌號碼等關鍵資訊）
                    if (isValidRecord(rowData)) {
                        rowData.sourceUrl = url;
                        rowData.crawlTime = new Date().toISOString();
                        results.push(rowData);
                    }
                });
                
                logger.debug(`從表格 #${tableId} 中解析出 ${results.length} 筆記錄`);
            }
        });
        
        logger.info(`成功從 ${url} 爬取到 ${results.length} 筆資料`);
        return results;
    } catch (error: any) {
        logger.error(`表格爬蟲執行失敗: ${error.message}`);
        throw new Error(`表格爬蟲執行失敗: ${error.message}`);
    }
}

/**
 * 檢查表格是否為酒駕累犯資料表格
 * @param $ Cheerio API
 * @param table 表格元素
 * @returns 是否為目標表格
 */
function checkIfTargetTable($: cheerio.CheerioAPI, table: cheerio.Element): boolean {
    // 這個判斷邏輯需要根據實際網站結構調整
    // 可能的判斷條件：表格標題、表格 ID、表格類別、表頭內容等
    
    const tableText = $(table).text().toLowerCase();
    const headers: string[] = [];
    
    $(table).find('tr:first-child th, tr:first-child td').each((i, el) => {
        headers.push($(el).text().trim().toLowerCase());
    });
    
    // 檢查表格是否包含相關關鍵字或特定欄位
    const keywordInTable = tableText.includes('酒駕') || 
                           tableText.includes('累犯') || 
                           tableText.includes('駕駛人');
    
    const hasRequiredColumns = headers.some(h => h.includes('姓名')) &&
                              (headers.some(h => h.includes('身分證')) || 
                               headers.some(h => h.includes('車號')));
    
    return keywordInTable && hasRequiredColumns;
}

/**
 * 檢查記錄是否有效
 * @param record 記錄資料
 * @returns 記錄是否有效
 */
function isValidRecord(record: RawOffenderRecord): boolean {
    // 檢查記錄是否包含必要欄位
    // 實際欄位名稱可能需要根據不同監理所網站調整
    
    // 取得所有欄位名稱（轉換為小寫便於比對）
    const fields = Object.keys(record).map(f => f.toLowerCase());
    
    // 檢查是否包含姓名欄位
    const hasName = fields.some(f => 
        f.includes('姓名') || f.includes('駕駛人') || f.includes('name')
    );
    
    // 檢查是否包含身分識別欄位（身分證字號或車牌號碼）
    const hasIdentifier = fields.some(f => 
        f.includes('身分證') || f.includes('證號') || f.includes('車號') || 
        f.includes('車牌') || f.includes('id') || f.includes('license')
    );
    
    // 記錄必須同時包含姓名和識別碼才視為有效
    return hasName && hasIdentifier && Object.values(record).some(v => v.length > 0);
}
