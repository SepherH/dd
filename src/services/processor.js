/**
 * 資料處理器
 * 
 * 負責處理從爬蟲獲取的原始資料，進行清洗、驗證和儲存
 */

import { extractStructuredData } from './aiService.js';
import { OffenderRecord } from '../models/offenderRecord.js';
import { logger } from '../utils/logger.js';

/**
 * 處理監理所爬取的資料
 * @param {Array} rawData 原始資料陣列
 * @param {string} sourceName 資料來源名稱
 * @returns {Promise<number>} 成功處理的記錄數量
 */
export async function processDmvData(rawData, sourceName) {
  try {
    logger.info(`開始處理 ${sourceName} 的 ${rawData.length} 筆原始資料`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const data of rawData) {
      try {
        // 資料結構化處理
        let structuredData = data;
        
        // 如果資料不是結構化格式，使用 AI 服務進行結構化
        if (typeof data === 'string' || !isStructuredData(data)) {
          const textContent = typeof data === 'string' ? data : JSON.stringify(data);
          structuredData = await extractStructuredData(textContent);
        }
        
        // 驗證並標準化資料
        const validatedData = validateAndNormalize(structuredData, sourceName);
        
        if (validatedData) {
          // 檢查是否為重複資料
          const existingRecord = await OffenderRecord.findOne({
            idNumber: validatedData.idNumber,
            licensePlate: validatedData.licensePlate,
            caseNumber: validatedData.caseNumber
          });
          
          if (existingRecord) {
            // 更新現有記錄
            await OffenderRecord.updateOne(
              { _id: existingRecord._id },
              { 
                $set: { ...validatedData },
                $addToSet: { sources: validatedData.sources[0] }
              }
            );
            logger.debug(`更新現有記錄: ${existingRecord._id}`);
          } else {
            // 建立新記錄
            const newRecord = new OffenderRecord(validatedData);
            await newRecord.save();
            logger.debug(`建立新記錄: ${newRecord._id}`);
          }
          
          successCount++;
        } else {
          failCount++;
        }
      } catch (itemError) {
        logger.error(`處理單筆資料失敗: ${itemError.message}`);
        failCount++;
      }
    }
    
    logger.info(`${sourceName} 資料處理完成: ${successCount} 筆成功, ${failCount} 筆失敗`);
    return successCount;
  } catch (error) {
    logger.error(`處理 ${sourceName} 資料失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 檢查資料是否為結構化格式
 * @param {any} data 要檢查的資料
 * @returns {boolean} 是否為結構化資料
 */
function isStructuredData(data) {
  // 檢查資料是否為物件且包含必要欄位
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  // 判斷是否包含至少一個必要欄位
  const hasName = 'name' in data || '姓名' in data || 'fullName' in data;
  const hasId = 'idNumber' in data || '身分證字號' in data || 'id' in data;
  const hasLicensePlate = 'licensePlate' in data || '車牌號碼' in data || 'plateNumber' in data;
  
  return hasName && (hasId || hasLicensePlate);
}

/**
 * 驗證並標準化資料
 * @param {Object} data 輸入資料
 * @param {string} sourceName 資料來源名稱
 * @returns {Object|null} 標準化後的資料或 null
 */
function validateAndNormalize(data, sourceName) {
  try {
    if (!data || typeof data !== 'object') {
      logger.warn('資料驗證失敗: 無效的資料格式');
      return null;
    }
    
    // 建立標準化資料物件
    const normalizedData = {
      name: getValueFromMultipleKeys(data, ['name', '姓名', 'fullName']),
      idNumber: getValueFromMultipleKeys(data, ['idNumber', '身分證字號', 'id', 'ID']),
      licensePlate: getValueFromMultipleKeys(data, ['licensePlate', '車牌號碼', '車號', 'plateNumber', 'vehicleNumber']),
      violationDate: parseDate(getValueFromMultipleKeys(data, ['violationDate', '違規日期', '日期', 'date'])),
      caseNumber: getValueFromMultipleKeys(data, ['caseNumber', '裁決字號', '案號', 'caseId']),
      gender: normalizeGender(getValueFromMultipleKeys(data, ['gender', '性別', 'sex'])),
      sources: [{
        name: sourceName,
        url: data.sourceUrl || data.url || null,
        imageUrl: data.imageUrl || null,
        crawlTime: data.crawlTime || new Date().toISOString()
      }],
      rawData: JSON.stringify(data)
    };
    
    // 驗證必要欄位
    if (!normalizedData.name || (!normalizedData.idNumber && !normalizedData.licensePlate)) {
      logger.warn('資料驗證失敗: 缺少必要欄位 (姓名和身分證字號/車牌號碼)');
      return null;
    }
    
    // 標準化姓名格式
    normalizedData.name = normalizedData.name.trim().replace(/\s+/g, ' ');
    
    // 標準化身分證字號格式（如果有）
    if (normalizedData.idNumber) {
      normalizedData.idNumber = normalizedData.idNumber.trim().toUpperCase();
    }
    
    // 標準化車牌號碼格式（如果有）
    if (normalizedData.licensePlate) {
      normalizedData.licensePlate = normalizedData.licensePlate.trim().toUpperCase();
    }
    
    return normalizedData;
  } catch (error) {
    logger.error(`資料標準化失敗: ${error.message}`);
    return null;
  }
}

/**
 * 從多個可能的鍵值中取得資料
 * @param {Object} data 資料物件
 * @param {Array<string>} keys 可能的鍵值陣列
 * @returns {string|null} 找到的值或 null
 */
function getValueFromMultipleKeys(data, keys) {
  for (const key of keys) {
    if (key in data && data[key] !== null && data[key] !== undefined) {
      return String(data[key]);
    }
  }
  return null;
}

/**
 * 解析日期字串為標準格式
 * @param {string|null} dateStr 日期字串
 * @returns {string|null} 標準格式日期字串或 null
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // 移除非數字和非分隔符的字符
    const cleanDateStr = dateStr.replace(/[^0-9/\-\.年月日]/g, '');
    
    // 嘗試解析不同格式的日期
    let date;
    
    // 檢查是否為中文日期格式（如 2023年7月1日）
    if (/年|月|日/.test(cleanDateStr)) {
      const parts = cleanDateStr.split(/年|月|日/).filter(p => p);
      if (parts.length >= 3) {
        date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
      }
    } 
    // 檢查常見的西方日期格式
    else {
      date = new Date(cleanDateStr);
    }
    
    // 驗證日期是否有效
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // 轉換為 ISO 格式
    return date.toISOString().split('T')[0];
  } catch (error) {
    logger.warn(`日期解析失敗: ${dateStr} - ${error.message}`);
    return null;
  }
}

/**
 * 標準化性別資料
 * @param {string|null} genderStr 性別字串
 * @returns {string|null} 標準化後的性別值 ('male', 'female', 或 null)
 */
function normalizeGender(genderStr) {
  if (!genderStr) return null;
  
  const lowerGender = genderStr.toLowerCase().trim();
  
  if (['male', 'm', '男', '男性', '先生', '男子'].includes(lowerGender)) {
    return 'male';
  } else if (['female', 'f', '女', '女性', '小姐', '女士', '女子'].includes(lowerGender)) {
    return 'female';
  }
  
  return null;
}
