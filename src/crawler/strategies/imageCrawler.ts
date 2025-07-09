/**
 * 圖片型態網頁的爬蟲策略
 * 
 * 專門處理以圖片形式呈現酒駕累犯資料的網頁
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import { logger } from '../../utils/logger';
import { extractTextFromImage } from '../../services/aiService';

// 定義爬取結果的介面
interface ImageCrawlerResult {
    [key: string]: string;
    sourceUrl: string;
    imageUrl: string;
    crawlTime: string;
}

/**
 * 爬取圖片型態的監理所網頁
 * @param url 監理所網頁 URL
 * @returns 爬取到的資料陣列
 */
export async function imageCrawler(url: string): Promise<ImageCrawlerResult[]> {
    try {
        logger.info(`開始爬取圖片資料: ${url}`);
        
        const response = await axios({
            method: 'GET',
            url,
            timeout: parseInt(process.env.CRAWLER_TIMEOUT || '60000'),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
                // 確保正確處理多語系
                'Accept-Charset': 'utf-8'
            },
            // 確保正確處理多語系資料
            responseEncoding: 'utf8'
        });
        
        const html = response.data;
        const $ = cheerio.load(html, {
            // 確保 cheerio 能正確處理多語系和編碼問題
            decodeEntities: false
        });
        const results: ImageCrawlerResult[] = [];
        
        // 尋找頁面上的圖片元素
        const images = $('img');
        logger.info(`找到 ${images.length} 個圖片元素`);
        
        // 為避免重複下載，建立一個已處理的 URL 集合
        const processedUrls = new Set<string>();
        
        // 處理每個圖片
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            let imgUrl = $(img).attr('src');
            
            // 檢查圖片 URL 是否有效
            if (!imgUrl) continue;
            
            // 處理相對路徑
            if (imgUrl.startsWith('/') || !imgUrl.startsWith('http')) {
                const baseUrl = new URL(url);
                imgUrl = `${baseUrl.origin}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
            }
            
            // 檢查是否已處理過此圖片
            if (processedUrls.has(imgUrl)) continue;
            processedUrls.add(imgUrl);
            
            // 檢查此圖片是否可能含有酒駕累犯資料
            if (isPotentialOffenderImage($, img)) {
                logger.info(`發現可能包含酒駕累犯資料的圖片: ${imgUrl}`);
                
                // 下載圖片
                const localPath = await downloadImage(imgUrl);
                
                // 使用 AI 服務解析圖片內容
                if (localPath) {
                    try {
                        const extractedData = await extractTextFromImage(localPath);
                        
                        // 如果成功解析出資料
                        if (extractedData && extractedData.length > 0) {
                            extractedData.forEach((record: any) => {
                                // 確保資料包含必要欄位且使用正確的編碼
                                const typedRecord: ImageCrawlerResult = {
                                    ...record,
                                    sourceUrl: url,
                                    imageUrl: imgUrl,
                                    crawlTime: new Date().toISOString()
                                };
                                results.push(typedRecord);
                            });
                            
                            logger.info(`從圖片 ${imgUrl} 成功解析出 ${extractedData.length} 筆資料`);
                        }
                    } catch (extractError: any) {
                        logger.error(`解析圖片 ${imgUrl} 失敗: ${extractError.message}`);
                    } finally {
                        // 清理下載的臨時圖片
                        try {
                            fs.unlinkSync(localPath);
                        } catch (e: any) {
                            logger.warn(`刪除臨時圖片檔案失敗: ${e.message}`);
                        }
                    }
                }
            }
        }
        
        logger.info(`成功從 ${url} 爬取並解析 ${results.length} 筆資料`);
        return results;
    } catch (error: any) {
        logger.error(`圖片爬蟲執行失敗: ${error.message}`);
        throw new Error(`圖片爬蟲執行失敗: ${error.message}`);
    }
}

/**
 * 檢查圖片是否可能包含酒駕累犯資料
 * @param $ Cheerio API
 * @param img 圖片元素
 * @returns 是否可能包含目標資料
 */
function isPotentialOffenderImage($: cheerio.CheerioAPI, img: cheerio.Element): boolean {
    // 這個判斷邏輯需要根據實際網站結構調整
    
    // 檢查圖片的 alt 文字
    const altText = $(img).attr('alt') || '';
    if (altText.includes('酒駕') || altText.includes('累犯') || altText.includes('名單')) {
        return true;
    }
    
    // 檢查圖片的檔名
    const src = $(img).attr('src') || '';
    const filename = path.basename(src).toLowerCase();
    if (filename.includes('drunk') || filename.includes('offender') || 
        filename.includes('alcohol') || filename.includes('dui') ||
        filename.includes('酒駕') || filename.includes('名單')) {
        return true;
    }
    
    // 檢查圖片附近的文字內容
    const parentText = $(img).parent().text().toLowerCase();
    if (parentText.includes('酒駕') || parentText.includes('累犯') || 
        parentText.includes('公告') || parentText.includes('名單')) {
        return true;
    }
    
    return false;
}

/**
 * 下載圖片到本地暫存目錄
 * @param url 圖片 URL
 * @returns 本地暫存路徑或 null
 */
async function downloadImage(url: string): Promise<string | null> {
    try {
        // 建立暫存目錄
        const tempDir = path.resolve(process.cwd(), 'data', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // 生成唯一的檔名
        const filename = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
        const filepath = path.join(tempDir, filename);
        
        // 下載圖片
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'arraybuffer',
            timeout: parseInt(process.env.CRAWLER_TIMEOUT || '60000')
        });
        
        // 儲存檔案
        fs.writeFileSync(filepath, response.data);
        logger.debug(`圖片下載成功: ${url} -> ${filepath}`);
        
        return filepath;
    } catch (error: any) {
        logger.error(`圖片下載失敗 ${url}: ${error.message}`);
        return null;
    }
}
