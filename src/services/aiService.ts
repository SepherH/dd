/**
 * AI 服務模組
 * 
 * 負責與 OpenAI API 整合，處理圖片文字辨識和資料結構化
 */

import OpenAI from 'openai';
import fs from 'fs';
import { logger } from '../utils/logger';

// 定義回應資料型別
export interface OffenderData {
    [key: string]: string | null | undefined;
    name: string | null;
    gender: string | null;
    idNumber: string | null;
    licensePlate: string | null;
    violationDate: string | null;
    caseNumber: string | null;
    sourceUrl?: string;
    imageUrl?: string;
    crawlTime?: string;
}

// 初始化 OpenAI 客戶端
let openai: OpenAI | null = null;
let isOpenAiAvailable = false;

try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        isOpenAiAvailable = true;
        logger.info('成功初始化 OpenAI 客戶端');
    } else {
        logger.warn('OPENAI_API_KEY 環境變數未設定，將使用模擬模式');
    }
} catch (error: any) {
    logger.error(`OpenAI 客戶端初始化失敗: ${error.message}`);
}

/**
 * 從圖片中提取文字和結構化資料
 * @param imagePath 圖片本地路徑
 * @returns 提取出的結構化資料陣列
 */
export async function extractTextFromImage(imagePath: string): Promise<OffenderData[]> {
    try {
        if (!isOpenAiAvailable) {
            logger.warn(`模擬模式: 返回模擬圖片識別資料 (${imagePath})`);
            return [getMockOffenderData()];
        }
        
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

        // 使用 OpenAI Vision API 辨識圖片內容，特別處理中文和多語系
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
            messages: [
                {
                    role: 'system',
                    content: '你是一個專業的資料擷取助手，負責從圖片中辨識酒駕累犯名單的資料，並將其結構化。請將所有辨識到的人員資料轉換為 JSON 格式的陣列輸出。每筆資料應包含可能的欄位如：姓名、性別、身分證字號/車牌號碼、違規日期、裁決字號等。如果某個欄位無法辨識，請將其值設為 null。請特別注意中文字和特殊符號的正確解析，確保使用 UTF-8 編碼輸出。'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: '請從這張圖片中辨識酒駕累犯名單的資料，並將資料結構化為 JSON 格式的陣列。請特別注意中文字和數字的準確性。'
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
        const aiResponse = response.choices[0].message.content || '';
        logger.debug(`AI 回應: ${aiResponse}`);

        // 從 AI 回應中提取 JSON 資料
        const jsonData = extractJsonFromResponse(aiResponse);
        
        if (!jsonData || jsonData.length === 0) {
            logger.warn(`無法從 AI 回應中提取有效的 JSON 資料: ${aiResponse}`);
            return [];
        }

        logger.info(`成功從圖片中提取 ${jsonData.length} 筆資料`);
        return jsonData as OffenderData[];
    } catch (error: any) {
        logger.error(`圖片文字辨識失敗: ${error.message}`);
        throw error;
    }
}

/**
 * 從 AI 回應中提取 JSON 資料
 * @param response AI 回應文字
 * @returns 解析出的 JSON 陣列或 null
 */
export function extractJsonFromResponse(response: string): OffenderData[] | null {
    try {
        // 嘗試直接解析整個回應
        try {
            // 處理可能的 BOM 和其他多語系編碼問題
            const cleanResponse = response.trim().replace(/^\uFEFF/, '');
            const parsedData = JSON.parse(cleanResponse);
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
    } catch (error: any) {
        logger.error(`解析 JSON 失敗: ${error.message}`);
        return null;
    }
}

/**
 * 從非結構化文字中提取結構化資料
 * @param text 文字內容
 * @returns 結構化資料
 */
export async function extractStructuredData(text: string): Promise<OffenderData | OffenderData[]> {
    try {
        if (!isOpenAiAvailable) {
            logger.warn('模擬模式: 返回模擬結構化資料');
            return getMockOffenderData();
        }
        
        if (!openai) {
            throw new Error('OpenAI 客戶端尚未初始化，請檢查 API 金鑰設定');
        }

        logger.info('開始從文字中提取結構化資料');

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
            messages: [
                {
                    role: 'system',
                    content: '你是一個專業的資料擷取助手，負責從文字中提取酒駕累犯相關的結構化資料。請將所有辨識到的人員資料轉換為 JSON 格式輸出。每筆資料應包含可能的欄位如：姓名、性別、身分證字號/車牌號碼、違規日期、裁決字號等。如果某個欄位無法辨識，請將其值設為 null。請確保正確處理中文字和特殊符號，使用 UTF-8 編碼輸出。'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 2000
        });

        // 解析 AI 回應
        const aiResponse = response.choices[0].message.content || '';

        // 從 AI 回應中提取 JSON 資料
        const jsonData = extractJsonFromResponse(aiResponse);
        
        if (!jsonData) {
            logger.warn(`無法從 AI 回應中提取有效的 JSON 資料: ${aiResponse}`);
            // 返回一個空的但符合型別的物件
            return {
                name: null,
                gender: null,
                idNumber: null,
                licensePlate: null,
                violationDate: null,
                caseNumber: null
            };
        }

        // 如果是陣列但只有一個元素，直接返回該元素
        if (Array.isArray(jsonData) && jsonData.length === 1) {
            return jsonData[0];
        }

        return jsonData;
    } catch (error: any) {
        logger.error(`文字結構化處理失敗: ${error.message}`);
        throw error;
    }
}

/**
 * 從文件中提取文字
 * @param documentUrl 文件網址或路徑
 * @param fileType 檔案類型
 * @returns 提取的文字內容
 */
export async function extractTextFromDocument(documentUrl: string, fileType: string = 'pdf'): Promise<string | null> {
    try {
        if (!isOpenAiAvailable) {
            logger.warn(`模擬模式: 返回模擬文件內容 (${documentUrl})`);
            return '這是一個模擬的文件內容，用於測試系統。姓名：測試姓名，身分證號碼：A123456789，車牙：測-1234。';
        }
        
        if (!openai) {
            throw new Error('OpenAI 客戶端尚未初始化，請檢查 API 金鑰設定');
        }

        logger.info(`開始處理${fileType}文件: ${documentUrl}`);
        
        // 目前僅支援本地檔案路徑
        if (!fs.existsSync(documentUrl)) {
            logger.error(`文件不存在: ${documentUrl}`);
            return null;
        }
        
        // 使用 OpenAI API 提取文件內容
        const response = await openai.chat.completions.create({
            model: 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'system',
                    content: '你是一個專業的文件內容提取助手。請從提供的文件中提取所有文字內容，保留原始格式與結構。'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `請從這份${fileType}文件中提取所有文字內容。` },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:application/${fileType};base64,${fs.readFileSync(documentUrl, { encoding: 'base64' })}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4000
        });
        
        const extractedText = response.choices[0]?.message?.content;
        if (!extractedText) {
            logger.error('無法從文件中提取文字');
            return null;
        }
        
        logger.info('文件文字提取成功');
        return extractedText;
    } catch (error: any) {
        logger.error(`文件文字提取失敗: ${error.message}`);
        return null;
    }
}

/**
 * 從文字中提取酒駕累犯資料
 * @param text 文字內容
 * @returns 酒駕累犯資料
 */
export async function extractOffenderData(text: string): Promise<OffenderData | null> {
    try {
        if (!isOpenAiAvailable) {
            logger.warn('模擬模式: 返回模擬酒駕累犯資料');
            return getMockOffenderData();
        }
        
        if (!openai) {
            throw new Error('OpenAI 客戶端尚未初始化，請檢查 API 金鑰設定');
        }

        logger.info('開始從文字提取酒駕累犯資料');
        
        if (!text || text.trim().length === 0) {
            logger.warn('提供的文字內容為空');
            return null;
        }
        
        // 使用現有的結構化資料提取功能
        const structuredData = await extractStructuredData(text);
        
        // 處理可能的陣列結果
        if (Array.isArray(structuredData)) {
            if (structuredData.length === 0) {
                logger.warn('無法從文字中提取任何資料');
                return null;
            }
            
            // 返回第一個有效的記錄
            for (const item of structuredData) {
                if (item && item.name) {
                    return item;
                }
            }
            
            return structuredData[0] || null;
        }
        
        return structuredData || null;
    } catch (error: any) {
        logger.error(`酒駕累犯資料提取失敗: ${error.message}`);
        return null;
    }
}

/**
 * 檢測文字的語言
 * @param text 要檢測的文字
 * @returns 檢測到的語言代碼 (如 zh-tw, en, vi)
 */
export async function detectLanguage(text: string): Promise<string | undefined> {
    try {
        if (!isOpenAiAvailable) {
            logger.warn('模擬模式: 返回預設語言代碼');
            return 'zh-tw';
        }
        
        if (!openai) {
            throw new Error('OpenAI 客戶端尚未初始化，請檢查 API 金鑰設定');
        }

        logger.info('開始檢測文字語言');
        
        if (!text || text.trim().length === 0) {
            logger.warn('提供的文字內容為空');
            return undefined;
        }
        
        // 使用 OpenAI API 檢測語言
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: '你是一個專業的語言檢測工具。請檢測提供文字的語言，並僅返回對應的語言代碼 (如 zh-tw 表示繁體中文、en 表示英文、vi 表示越南文)。'
                },
                {
                    role: 'user',
                    content: `檢測此文字的語言："${text.substring(0, 500)}"，請僅返回語言代碼，不要加任何其他說明文字。`
                }
            ],
            max_tokens: 10
        });
        
        const languageCode = response.choices[0]?.message?.content?.trim();
        
        logger.info(`語言檢測結果: ${languageCode || '未能檢測'}`);
        return languageCode;
    } catch (error: any) {
        logger.error(`語言檢測失敗: ${error.message}`);
        return undefined;
    }
}

// 匯出模組
export const aiService = {
    extractTextFromImage,
    extractJsonFromResponse,
    extractStructuredData,
    extractTextFromDocument,
    extractOffenderData,
    detectLanguage
};

/**
 * 提供模擬的測試資料，用於 API 金鑰缺失時
 * @returns 模擬的酒駕累犯資料
 */
function getMockOffenderData(): OffenderData {
    return {
        name: '測試姓名',
        gender: 'male',
        idNumber: 'A123456789',
        licensePlate: '測-1234',
        violationDate: new Date().toISOString().split('T')[0],
        caseNumber: 'TEST-' + Math.floor(Math.random() * 10000),
        sourceUrl: 'https://example.com/test',
        imageUrl: 'https://example.com/test.jpg',
        crawlTime: new Date().toISOString()
    };
}

// 預設匯出
export default aiService;
