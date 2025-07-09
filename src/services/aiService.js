/**
 * AI 服務模組
 * 
 * 負責與 OpenAI API 整合，處理圖片文字辨識和資料結構化
 */

import OpenAI from 'openai';
import fs from 'fs';
import { logger } from '../utils/logger.js';

// 初始化 OpenAI 客戶端
let openai = null;

try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (error) {
  logger.error(`OpenAI 客戶端初始化失敗: ${error.message}`);
}

/**
 * 從圖片中提取文字和結構化資料
 * @param {string} imagePath 圖片本地路徑
 * @returns {Promise<Array>} 提取出的結構化資料陣列
 */
export async function extractTextFromImage(imagePath) {
  try {
    if (!openai) {
      throw new Error('OpenAI 客戶端尚未初始化，請檢查 API 金鑰設定');
    }

    logger.info(`開始處理圖片: ${imagePath}`);

    // 檢查檔案存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`圖片檔案不存在: ${imagePath}`);
    }

    // 讀取圖片檔案
    const imageBuffer = fs.readFileSync(imagePath);
    
    // 將圖片轉換為 base64 格式
    const base64Image = imageBuffer.toString('base64');

    // 使用 OpenAI Vision API 辨識圖片內容
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一個專業的資料擷取助手，負責從圖片中辨識酒駕累犯名單的資料，並將其結構化。請將所有辨識到的人員資料轉換為 JSON 格式的陣列輸出。每筆資料應包含可能的欄位如：姓名、性別、身分證字號/車牌號碼、違規日期、裁決字號等。如果某個欄位無法辨識，請將其值設為 null。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '請從這張圖片中辨識酒駕累犯名單的資料，並將資料結構化為 JSON 格式的陣列。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000
    });

    // 解析 AI 回應
    const aiResponse = response.choices[0].message.content;
    logger.debug(`AI 回應: ${aiResponse}`);

    // 從 AI 回應中提取 JSON 資料
    const jsonData = extractJsonFromResponse(aiResponse);
    
    if (!jsonData || jsonData.length === 0) {
      logger.warn(`無法從 AI 回應中提取有效的 JSON 資料: ${aiResponse}`);
      return [];
    }

    logger.info(`成功從圖片中提取 ${jsonData.length} 筆資料`);
    return jsonData;
  } catch (error) {
    logger.error(`圖片文字辨識失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 從 AI 回應中提取 JSON 資料
 * @param {string} response AI 回應文字
 * @returns {Array|null} 解析出的 JSON 陣列或 null
 */
function extractJsonFromResponse(response) {
  try {
    // 嘗試直接解析整個回應
    try {
      const parsedData = JSON.parse(response);
      if (Array.isArray(parsedData)) {
        return parsedData;
      }
      // 如果解析結果不是陣列，可能是單一物件，將其轉換為陣列
      return [parsedData];
    } catch (e) {
      // 如果直接解析失敗，嘗試在回應中尋找 JSON 字串
      const jsonPattern = /\[[\s\S]*\]|\{[\s\S]*\}/g;
      const matches = response.match(jsonPattern);
      
      if (matches && matches.length > 0) {
        const jsonStr = matches[0];
        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData)) {
          return parsedData;
        }
        return [parsedData];
      }
      
      logger.warn('無法在回應中找到有效的 JSON 格式');
      return null;
    }
  } catch (error) {
    logger.error(`解析 JSON 失敗: ${error.message}`);
    return null;
  }
}

/**
 * 從非結構化文字中提取結構化資料
 * @param {string} text 文字內容
 * @returns {Promise<Object>} 結構化資料
 */
export async function extractStructuredData(text) {
  try {
    if (!openai) {
      throw new Error('OpenAI 客戶端尚未初始化，請檢查 API 金鑰設定');
    }

    logger.info('開始從文字中提取結構化資料');

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一個專業的資料擷取助手，負責從文字中提取酒駕累犯相關的結構化資料。請將所有辨識到的人員資料轉換為 JSON 格式輸出。每筆資料應包含可能的欄位如：姓名、性別、身分證字號/車牌號碼、違規日期、裁決字號等。如果某個欄位無法辨識，請將其值設為 null。'
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 2000
    });

    // 解析 AI 回應
    const aiResponse = response.choices[0].message.content;

    // 從 AI 回應中提取 JSON 資料
    const jsonData = extractJsonFromResponse(aiResponse);
    
    if (!jsonData) {
      logger.warn(`無法從 AI 回應中提取有效的 JSON 資料: ${aiResponse}`);
      return {};
    }

    // 如果是陣列但只有一個元素，直接返回該元素
    if (Array.isArray(jsonData) && jsonData.length === 1) {
      return jsonData[0];
    }

    return jsonData;
  } catch (error) {
    logger.error(`文字結構化處理失敗: ${error.message}`);
    throw error;
  }
}
