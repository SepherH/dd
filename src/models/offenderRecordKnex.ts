/**
 * 酒駕累犯記錄資料模型 (使用 Knex.js 實現)
 */

import { knex } from '../database/knexConfig';
import { logger } from '../utils/logger';
import { OffenderRecord as OffenderRecordType } from '../types';

// 定義來源資訊介面
export interface SourceInfo {
    id?: number;
    offenderId: number;
    name: string;
    url?: string;
    imageUrl?: string;
    crawlTime: Date;
    createdAt?: Date;
}

/**
 * 酒駕累犯資料模型類別
 * 提供資料庫操作方法，使用 Knex.js 實現
 */
export class OffenderRecordModel {
    /**
     * 根據 ID 取得單一酒駕累犯記錄
     * @param id 記錄 ID
     * @returns 酒駕累犯記錄或 null
     */
    static async findById(id: number): Promise<OffenderRecordType | null> {
        try {
            const record = await knex('offenders')
                .select('*')
                .where({ id })
                .first();
                
            return record || null;
        } catch (error: any) {
            logger.error(`根據 ID 查詢酒駕累犯記錄失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 取得所有酒駕累犯記錄（支援分頁）
     * @param options 分頁選項
     * @returns 符合條件的記錄陣列
     */
    static async findAll(options: { 
        limit?: number; 
        offset?: number; 
        orderBy?: string; 
        order?: 'asc' | 'desc' 
    } = {}): Promise<OffenderRecordType[]> {
        try {
            const { 
                limit = 20, 
                offset = 0, 
                orderBy = 'updated_at', 
                order = 'desc' 
            } = options;

            return await knex('offenders')
                .select('*')
                .orderBy(orderBy, order)
                .limit(limit)
                .offset(offset);
        } catch (error: any) {
            logger.error(`查詢酒駕累犯記錄列表失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 計算記錄總數
     * @param whereClause 可選的查詢條件
     * @returns 記錄總數
     */
    static async count(whereClause: Record<string, any> = {}): Promise<number> {
        try {
            const result = await knex('offenders')
                .where(whereClause)
                .count('id as count')
                .first();
                
            return result ? Number(result.count) : 0;
        } catch (error: any) {
            logger.error(`計算酒駕累犯記錄總數失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 根據條件查詢酒駕累犯記錄
     * @param conditions 查詢條件
     * @returns 符合條件的記錄陣列
     */
    static async find(conditions: { 
        name?: string; 
        idNumber?: string; 
        licensePlate?: string; 
        startDate?: Date | string; 
        endDate?: Date | string; 
        limit?: number; 
        offset?: number;
    }): Promise<OffenderRecordType[]> {
        try {
            const { 
                name, 
                idNumber, 
                licensePlate, 
                startDate, 
                endDate, 
                limit = 20, 
                offset = 0 
            } = conditions;

            // 使用 Knex 查詢建構器
            const query = knex('offenders').select('*');

            if (name) {
                query.where('name', 'like', `%${name}%`);
            }

            if (idNumber) {
                query.where('id_number', idNumber);
            }

            if (licensePlate) {
                query.where('license_plate', licensePlate);
            }

            // 因為 violation_date 不在 offenders 表中，這裡先去除日期條件
            // 後續可以修改為聯表查詢 violations 表來加入日期條件

            return await query
                .orderBy('updated_at', 'desc')
                .limit(limit)
                .offset(offset);
        } catch (error: any) {
            logger.error(`根據條件查詢酒駕累犯記錄失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 創建新的酒駕累犯記錄
     * @param data 記錄資料
     * @returns 新建的記錄
     */
    static async create(data: Omit<OffenderRecordType, 'id' | 'created_at' | 'updated_at'>): Promise<OffenderRecordType> {
        try {
            // 處理日期
            const violationDate = data.violationDate 
                ? new Date(data.violationDate).toISOString().split('T')[0] 
                : null;
            
            // 準備插入資料
            const insertData = {
                name: data.name,
                id_number: data.idNumber || null,
                license_plate: data.licensePlate || null,
                gender: data.gender || null,
                violation_date: violationDate,
                case_number: data.caseNumber || null,
                raw_data: data.rawData || null,
                source: data.source || '未知來源',
                source_url: data.sourceUrl || null,
                image_url: data.imageUrl || null,
                crawl_time: data.crawlTime || new Date()
            };

            // 插入資料
            const [id] = await knex('offenders').insert(insertData);
            
            // 取得新建記錄
            const newRecord = await this.findById(id);

            if (!newRecord) {
                throw new Error('創建記錄後無法取得新記錄');
            }

            return newRecord;
        } catch (error: any) {
            logger.error(`創建酒駕累犯記錄失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 更新酒駕累犯記錄
     * @param id 記錄 ID
     * @param data 更新資料
     * @returns 更新後的記錄
     */
    static async update(id: number, data: Partial<OffenderRecordType>): Promise<OffenderRecordType | null> {
        try {
            // 移除不應該更新的欄位
            const { id: _, created_at, updated_at, ...updateData } = data as any;
            
            // 處理欄位名稱轉換 (駝峰式轉換為下劃線式)
            const updateObj: Record<string, any> = {};
            
            // 處理可能的日期值
            if (updateData.violationDate) {
                if (typeof updateData.violationDate === 'object' && Object.keys(updateData.violationDate).length === 0) {
                    updateObj.violation_date = null;
                } else {
                    updateObj.violation_date = new Date(updateData.violationDate).toISOString().split('T')[0];
                }
                delete updateData.violationDate;
            }
            
            // 處理其他欄位
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    // 轉換欄位名稱格式
                    const fieldName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    updateObj[fieldName] = value;
                }
            });
            
            // 如果沒有要更新的欄位，直接返回原記錄
            if (Object.keys(updateObj).length === 0) {
                return await this.findById(id);
            }
            
            // 更新資料
            await knex('offenders')
                .where({ id })
                .update(updateObj);
                
            return await this.findById(id);
        } catch (error: any) {
            logger.error(`更新酒駕累犯記錄失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 刪除酒駕累犯記錄
     * @param id 記錄 ID
     * @returns 是否成功刪除
     */
    static async delete(id: number): Promise<boolean> {
        try {
            const affectedRows = await knex('offenders')
                .where({ id })
                .delete();
                
            return affectedRows > 0;
        } catch (error: any) {
            logger.error(`刪除酒駕累犯記錄失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 新增資料來源
     * @param offenderId 酒駕累犯記錄 ID
     * @param sourceData 來源資料
     * @returns 新建的來源資訊
     */
    static async addSource(offenderId: number, sourceData: Omit<SourceInfo, 'id' | 'offenderId' | 'createdAt'>): Promise<SourceInfo> {
        try {
            // 準備插入資料
            const insertData = {
                offender_id: offenderId,
                name: sourceData.name,
                url: sourceData.url || null,
                image_url: sourceData.imageUrl || null,
                crawl_time: sourceData.crawlTime instanceof Date 
                    ? sourceData.crawlTime 
                    : new Date(sourceData.crawlTime || Date.now())
            };
            
            // 插入資料
            const [id] = await knex('offender_sources').insert(insertData);
            
            // 取得新建資料
            const newSource = await knex('offender_sources')
                .where({ id })
                .first();
                
            if (!newSource) {
                throw new Error('創建來源資訊後無法取得資料');
            }
            
            return newSource;
        } catch (error: any) {
            logger.error(`新增資料來源失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 取得指定記錄的所有資料來源
     * @param offenderId 酒駕累犯記錄 ID
     * @returns 資料來源陣列
     */
    static async getSources(offenderId: number): Promise<SourceInfo[]> {
        try {
            return await knex('offender_sources')
                .where({ offender_id: offenderId })
                .orderBy('crawl_time', 'desc');
        } catch (error: any) {
            logger.error(`取得資料來源失敗: ${error.message}`);
            throw error;
        }
    }
}

// 為了相容性考慮，也提供與原模型相似的介面
export const OffenderRecord = OffenderRecordModel;
