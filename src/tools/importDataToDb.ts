/**
 * 爬取資料匯入資料庫工具
 * 
 * 此工具用於將爬取的 JSON 資料匯入到 MariaDB 資料庫中
 * 支援將臺中市交通事件裁決處的酒駕累犯資料轉換為資料庫格式並存入
 * 使用環境檢測功能自動處理內部/外部網路環境
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { OffenderRecordModel } from '../models/offenderRecordKnex';
import { knex } from '../database/knexConfig';
import { v4 as uuidv4 } from 'uuid';
import { getDatabaseConfig } from '../utils/dbEnvironment';

// 定義來源檔案結構類型
interface SourceFile {
  filename: string;
  source_path: string;
  extraction_date: string;
  records: SourceRecord[];
  metadata: {
    publish_date: string;
    year: string;
    month: string;
    day: string;
    source_name?: string;
    source_url?: string;
  };
}

// 來源記錄結構
interface SourceRecord {
  raw_line: string;
  序號: string;
  姓名: string;
  違規日: string;
  違規條款: string;
  違規地點?: string;
  違規事實?: string;
}

// 解析日期函式，處理民國年月日格式
function parseRocDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  try {
    // 將民國年轉為西元年 (民國年+1911)
    const year = parseInt(parts[0]) + 1911;
    const month = parseInt(parts[1]) - 1; // JavaScript 中月份從 0 開始
    const day = parseInt(parts[2]);
    
    return new Date(year, month, day);
  } catch (error) {
    logger.error(`日期解析失敗: ${dateStr}, 錯誤: ${error}`);
    return null;
  }
}

// 匯入單個檔案資料到資料庫
export async function importFileData(filePath: string): Promise<{
  total: number;
  imported: number;
  errors: number;
}> {
  const result = {
    total: 0,
    imported: 0,
    errors: 0
  };

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const sourceData: SourceFile = JSON.parse(fileContent);
    
    // 計算總記錄數
    result.total = sourceData.records.length;
    logger.info(`開始匯入 ${path.basename(filePath)}, 共 ${result.total} 筆記錄`);
    
    // 檢索來源資訊
    const crawlTime = new Date(sourceData.extraction_date);
    const sourceName = sourceData.metadata?.source_name || '臺中市交通事件裁決處';
    const sourceUrl = sourceData.metadata?.source_url || '';
    const publishDate = sourceData.metadata?.publish_date || '';
    
    // 將每筆記錄單獨處理，不使用單一事務，提高容錯性
    for (const record of sourceData.records) {
      try {
        // 處理資料轉換
        const violationDate = parseRocDate(record.違規日);
        
        // 從違規事實中擷取是否為酒精濃度超標、毒駕或拒測
        const violationType = record.違規事實?.includes('酒精濃度') 
          ? 'alcohol' 
          : record.違規事實?.includes('毒品') 
            ? 'drug' 
            : record.違規事實?.includes('拒絕') 
              ? 'refuse' 
              : 'unknown';
        
        // 擷取詳細違規情節
        const violationDetail = record.違規事實?.trim() || '';
        
        // 檢查記錄是否已存在，只使用姓名查詢
        const existingRecord = await OffenderRecordModel.find({
          name: record.姓名
        });
        
        if (existingRecord && existingRecord.length > 0) {
          logger.warn(`記錄已存在，跳過: ${record.姓名} - ${record.違規日}`);
          continue;
        }
        
        // 使用單獨的事務處理每筆記錄，避免一筆錯誤影響整個批次
        await knex.transaction(async (trx) => {
          // 1. 先建立約駕累犯記錄
          const offenderId = uuidv4();
          await trx('offenders').insert({
            id: offenderId,
            name: record.姓名,
            id_number: '',  // 身分證字號暫時留空
            gender: '',  // 性別暫時留空
            source: sourceName,
            remarks: `資料來源：${sourceName}\n爬取時間：${crawlTime.toISOString()}`,
            status: 'active'
          });
          
          // 2. 建立違規記錄
          const violationId = uuidv4();
          await trx('violations').insert({
            id: violationId,
            offender_id: offenderId,
            violation_date: violationDate,
            location: record.違規地點 || '',
            violation_type: violationType,
            details: violationDetail,
            case_number: record.違規條款,
            source_document: sourceUrl || ''
          });
        });
        
        result.imported++;
        logger.info(`成功匯入記錄: ${record.姓名} - ${record.違規日}`);
      } catch (error: any) {
        logger.error(`匯入記錄失敗 ${record.姓名}: ${error.message}`);
        result.errors++;
      }
    }
    
    logger.info(`匯入完成 ${path.basename(filePath)}: 成功 ${result.imported} 筆, 失敗 ${result.errors} 筆`);
    
  } catch (error: any) {
    logger.error(`匯入檔案失敗 ${filePath}: ${error.message}`);
    result.errors = result.total;
  }
  
  return result;
}

// 匯入指定目錄下的所有 JSON 檔案
export async function importDirectoryData(dirPath: string): Promise<{
  files: number;
  total: number;
  imported: number;
  errors: number;
}> {
  const result = {
    files: 0,
    total: 0,
    imported: 0,
    errors: 0
  };
  
  try {
    // 取得目錄中的所有 JSON 檔案
    const files = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.json'));
    
    result.files = files.length;
    logger.info(`在 ${dirPath} 中找到 ${result.files} 個 JSON 檔案`);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileResult = await importFileData(filePath);
      
      result.total += fileResult.total;
      result.imported += fileResult.imported;
      result.errors += fileResult.errors;
    }
    
    logger.info(`總結: 處理了 ${result.files} 個檔案, 共 ${result.total} 筆記錄, 成功匯入 ${result.imported} 筆, 失敗 ${result.errors} 筆`);
    
  } catch (error: any) {
    logger.error(`處理目錄 ${dirPath} 失敗: ${error.message}`);
  }
  
  return result;
}

// 主要執行函式
async function main() {
  try {
    logger.info('開始測試將爬取資料匯入資料庫');
    
    // 檢查資料庫連線
    try {
      await knex.raw('SELECT 1');
      logger.info('資料庫連線成功');
    } catch (error: any) {
      logger.error(`資料庫連線失敗: ${error.message}`);
      process.exit(1);
    }
    
    // 匯入爬取的資料
    const extractedDir = path.join(process.cwd(), 'data', 'extracted');
    const result = await importDirectoryData(extractedDir);
    
    logger.info('===== 匯入測試結果 =====');
    logger.info(`處理檔案數: ${result.files}`);
    logger.info(`總記錄數: ${result.total}`);
    logger.info(`成功匯入: ${result.imported}`);
    logger.info(`失敗記錄: ${result.errors}`);
    logger.info('=========================');
    
    // 關閉資料庫連線
    await knex.destroy();
    logger.info('測試完成');
    
  } catch (error: any) {
    logger.error(`執行匯入測試失敗: ${error.message}`);
    await knex.destroy();
    process.exit(1);
  }
}

// 執行主函式
if (require.main === module) {
  main().catch(error => {
    logger.error(`程式執行失敗: ${error.message}`);
    process.exit(1);
  });
}

// 已在各函數前加上 export 關鍵字，不需要重複匯出
