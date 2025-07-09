/**
 * 表單資料解析服務
 * 處理上傳的表單、圖像和文字資料，並整合 AI 服務進行資料提取
 */

import { aiService, OffenderData } from './aiService';
import { logger } from '../utils/logger';
import { OffenderRecord } from '../types';

// 表單資料結構
export interface FormData {
    text?: string;        // 手動輸入的文字
    imageUrl?: string;    // 上傳的圖片URL
    documentUrl?: string; // 上傳的文件URL
    fileType?: string;    // 檔案類型 (image, pdf, doc, etc)
    source?: string;      // 資料來源名稱
    sourceUrl?: string;   // 來源網址
}

/**
 * 解析表單資料並使用 AI 提取酒駕累犯資訊
 * @param formData 表單資料
 * @returns 解析後的酒駕累犯資料
 */
export async function parseFormData(formData: FormData): Promise<{
    success: boolean;
    data?: Partial<OffenderRecord>;
    errorMessage?: string;
}> {
    try {
        let textToProcess = '';
        
        // 處理不同來源的資料
        if (formData.text) {
            // 如果有直接輸入的文字
            textToProcess = formData.text;
            logger.info('使用手動輸入的文字進行解析');
        } else if (formData.imageUrl) {
            // 如果有上傳圖片，使用 AI 服務提取文字
            logger.info('從圖片提取文字');
            const imageText = await aiService.extractTextFromImage(formData.imageUrl);
            // 如果返回值是陣列，需要將其轉換為字串
            textToProcess = Array.isArray(imageText) ? 
                JSON.stringify(imageText, null, 2) : 
                (imageText ? JSON.stringify(imageText) : '');
            if (!textToProcess) {
                return {
                    success: false,
                    errorMessage: '無法從圖片中提取文字'
                };
            }
            // 這行不再需要，因為已經在上面處理了
        } else if (formData.documentUrl) {
            // 如果有上傳文件，使用 AI 服務提取文字
            logger.info('從文件提取文字');
            const documentText = await aiService.extractTextFromDocument(formData.documentUrl, formData.fileType || 'pdf');
            if (!documentText) {
                return {
                    success: false,
                    errorMessage: '無法從文件中提取文字'
                };
            }
            textToProcess = documentText;
        } else {
            return {
                success: false,
                errorMessage: '表單資料不完整，缺少文字、圖片或文件'
            };
        }

        // 使用 AI 服務解析文字並提取酒駕累犯資訊
        logger.info('使用 AI 服務解析文字中...');
        const aiResult = await aiService.extractOffenderData(textToProcess);
        if (!aiResult) {
            return {
                success: false,
                errorMessage: 'AI 服務無法解析文字'
            };
        }

        // 需要將 OffenderData 轉換為符合 OffenderRecord 型別的結構
        // 主要是將 null 轉換為 undefined 並確保型別正確
        const convertedData: Partial<OffenderRecord> = {
            name: aiResult.name ?? undefined,
            // 將 gender 轉換為正確的枚舉值
            gender: aiResult.gender === 'male' ? 'male' : 
                    aiResult.gender === 'female' ? 'female' : null,
            idNumber: aiResult.idNumber ?? undefined,
            licensePlate: aiResult.licensePlate ?? undefined,
            violationDate: aiResult.violationDate ?? undefined,
            caseNumber: aiResult.caseNumber ?? undefined
        };
        
        // 添加來源資訊
        const offenderData: Partial<OffenderRecord> = {
            ...convertedData,
            source: formData.source || '手動輸入',
            sourceUrl: formData.sourceUrl || undefined,
            imageUrl: formData.imageUrl || undefined,
            crawlTime: new Date()
        };

        return {
            success: true,
            data: offenderData
        };
    } catch (error: any) {
        logger.error(`表單資料解析失敗: ${error.message}, 詳細資訊: ${JSON.stringify(error)}`);
        return {
            success: false,
            errorMessage: `表單資料解析失敗: ${error.message}`
        };
    }
}

/**
 * 驗證並清理表單資料
 * @param formData 原始表單資料
 * @returns 清理後的表單資料
 */
export function validateFormData(formData: any): {
    isValid: boolean;
    data?: FormData;
    errorMessage?: string;
} {
    try {
        const cleanData: FormData = {};
        
        // 驗證並清理文字輸入
        if (formData.text && typeof formData.text === 'string') {
            cleanData.text = formData.text.trim();
        }
        
        // 驗證並清理圖片 URL
        if (formData.imageUrl && typeof formData.imageUrl === 'string') {
            cleanData.imageUrl = formData.imageUrl.trim();
        }
        
        // 驗證並清理文件 URL
        if (formData.documentUrl && typeof formData.documentUrl === 'string') {
            cleanData.documentUrl = formData.documentUrl.trim();
            
            // 驗證檔案類型
            if (formData.fileType && typeof formData.fileType === 'string') {
                const validFileTypes = ['pdf', 'doc', 'docx', 'txt', 'image'];
                const fileType = formData.fileType.toLowerCase();
                if (validFileTypes.includes(fileType)) {
                    cleanData.fileType = fileType;
                } else {
                    return {
                        isValid: false,
                        errorMessage: `不支援的檔案類型: ${formData.fileType}`
                    };
                }
            }
        }
        
        // 驗證並清理資料來源資訊
        if (formData.source && typeof formData.source === 'string') {
            cleanData.source = formData.source.trim();
        }
        
        if (formData.sourceUrl && typeof formData.sourceUrl === 'string') {
            cleanData.sourceUrl = formData.sourceUrl.trim();
        }
        
        // 確保至少有一個資料輸入途徑
        if (!cleanData.text && !cleanData.imageUrl && !cleanData.documentUrl) {
            return {
                isValid: false,
                errorMessage: '請至少提供文字、圖片或文件其中一種資料'
            };
        }
        
        return {
            isValid: true,
            data: cleanData
        };
    } catch (error: any) {
        return {
            isValid: false,
            errorMessage: `表單資料驗證失敗: ${error.message}`
        };
    }
}

/**
 * 使用不同文字和資料格式處理表單
 * 支援不同編碼和語言
 * @param content 表單內容
 * @returns 處理後的結果
 */
export async function processMultilingualContent(content: string): Promise<{
    success: boolean;
    data?: {
        detectedLanguage?: string;
        normalizedContent?: string;
        extractedData?: Partial<OffenderRecord>;
    };
    errorMessage?: string;
}> {
    try {
        // 檢測內容語言
        const detectedLanguage = await aiService.detectLanguage(content);
        
        // 正規化內容，確保特殊字符和非ASCII字符被正確處理
        const normalizedContent = content
            .normalize('NFC')  // 使用NFC正規化方式處理組合字符
            .replace(/[\uFFF0-\uFFFF]/g, ''); // 移除私有區域字符
            
        // 使用 AI 服務解析多語言內容
        const rawExtractedData = await aiService.extractOffenderData(normalizedContent);
        
        if (!rawExtractedData) {
            return {
                success: false,
                errorMessage: '無法從內容中提取有效資料'
            };
        }
        
        // 將 OffenderData (可能包含 null) 轉換為 Partial<OffenderRecord> (使用 undefined 代替 null)
        const extractedData: Partial<OffenderRecord> = {
            name: rawExtractedData.name ?? undefined,
            gender: rawExtractedData.gender === 'male' ? 'male' : 
                   rawExtractedData.gender === 'female' ? 'female' : null,
            idNumber: rawExtractedData.idNumber ?? undefined,
            licensePlate: rawExtractedData.licensePlate ?? undefined,
            violationDate: rawExtractedData.violationDate ?? undefined,
            caseNumber: rawExtractedData.caseNumber ?? undefined,
            sourceUrl: rawExtractedData.sourceUrl ?? undefined,
            imageUrl: rawExtractedData.imageUrl ?? undefined,
            crawlTime: rawExtractedData.crawlTime ?? undefined
        };
        
        return {
            success: true,
            data: {
                detectedLanguage,
                normalizedContent,
                extractedData
            }
        };
    } catch (error: any) {
        logger.error(`多語系內容處理失敗: ${error.message}, 詳細資訊: ${JSON.stringify(error)}`);
        return {
            success: false,
            errorMessage: `多語系內容處理失敗: ${error.message}`
        };
    }
}

export const formParser = {
    parseFormData,
    validateFormData,
    processMultilingualContent
};

export default formParser;
