/**
 * 酒駕累犯記錄資料模型
 */

import { query } from '../database/connection';
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
 * 提供資料庫操作方法
 */
export class OffenderRecordModel {
    /**
     * 根據 ID 取得單一酒駕累犯記錄
     * @param id 記錄 ID
     * @returns 酒駕累犯記錄或 null
     */
    static async findById(id: number): Promise<OffenderRecordType | null> {
        try {
            const sql = `
                SELECT * FROM offenders
                WHERE id = ?
            `;
            const records = await query<OffenderRecordType[]>(sql, [id]);
            return records.length > 0 ? records[0] : null;
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
        order?: 'ASC' | 'DESC' 
    } = {}): Promise<OffenderRecordType[]> {
        try {
            const { 
                limit = 20, 
                offset = 0, 
                orderBy = 'updated_at', 
                order = 'DESC' 
            } = options;

            const sql = `
                SELECT * FROM offenders
                ORDER BY ${orderBy} ${order}
                LIMIT ? OFFSET ?
            `;
            
            return await query<OffenderRecordType[]>(sql, [limit, offset]);
        } catch (error: any) {
            logger.error(`查詢酒駕累犯記錄列表失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 計算記錄總數
     * @param condition 可選的 WHERE 條件
     * @returns 記錄總數
     */
    static async count(condition?: string, params?: any[]): Promise<number> {
        try {
            let sql = 'SELECT COUNT(*) as count FROM offenders';
            
            if (condition) {
                sql += ` WHERE ${condition}`;
            }
            
            const result = await query<[{count: number}]>(sql, params || []);
            return result[0]?.count || 0;
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

            // 建立 WHERE 子句和參數陣列
            const whereConditions: string[] = [];
            const params: any[] = [];

            if (name) {
                whereConditions.push('name LIKE ?');
                params.push(`%${name}%`);
            }

            if (idNumber) {
                whereConditions.push('id_number = ?');
                params.push(idNumber);
            }

            if (licensePlate) {
                whereConditions.push('license_plate = ?');
                params.push(licensePlate);
            }

            if (startDate) {
                whereConditions.push('violation_date >= ?');
                params.push(startDate);
            }

            if (endDate) {
                whereConditions.push('violation_date <= ?');
                params.push(endDate);
            }

            // 組合 SQL 查詢
            let sql = 'SELECT * FROM offenders';
            
            if (whereConditions.length > 0) {
                sql += ' WHERE ' + whereConditions.join(' AND ');
            }
            
            sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            return await query<OffenderRecordType[]>(sql, params);
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
            // 確保處理日期時不會有多語系和編碼問題
            const violationDate = data.violationDate 
                ? new Date(data.violationDate).toISOString().split('T')[0] 
                : null;

            const sql = `
                INSERT INTO offenders (
                    name, 
                    id_number,
                    license_plate, 
                    gender, 
                    violation_date, 
                    case_number, 
                    raw_data,
                    source,
                    source_url,
                    image_url,
                    crawl_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                data.name,
                data.idNumber || null,
                data.licensePlate || null,
                data.gender || null,
                violationDate,
                data.caseNumber || null,
                data.rawData || null,
                data.source || '未知來源',
                data.sourceUrl || null,
                data.imageUrl || null,
                data.crawlTime || new Date()
            ];

            const result = await query<{ insertId: number }>(sql, params);
            const newRecord = await this.findById(result.insertId);

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

            // 建構 SET 子句
            const setClauses: string[] = [];
            const params: any[] = [];

            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    // 轉換欄位名稱格式（駝峰式轉換為下劃線式）
                    const fieldName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    setClauses.push(`${fieldName} = ?`);
                    
                    // 處理日期值
                    if (key === 'violationDate' && value) {
                        // 確保值不是空物件
                        if (typeof value === 'object' && Object.keys(value).length === 0) {
                            params.push(null);
                        } else {
                            params.push(new Date(value).toISOString().split('T')[0]);
                        }
                    } else {
                        params.push(value);
                    }
                }
            });

            // 如果沒有要更新的欄位，直接返回原記錄
            if (setClauses.length === 0) {
                return await this.findById(id);
            }

            const sql = `
                UPDATE offenders
                SET ${setClauses.join(', ')}
                WHERE id = ?
            `;
            params.push(id);

            await query(sql, params);
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
            const sql = 'DELETE FROM offenders WHERE id = ?';
            const result = await query<{ affectedRows: number }>(sql, [id]);
            return result.affectedRows > 0;
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
            const sql = `
                INSERT INTO offender_sources (
                    offender_id,
                    name,
                    url,
                    image_url,
                    crawl_time
                ) VALUES (?, ?, ?, ?, ?)
            `;

            const params = [
                offenderId,
                sourceData.name,
                sourceData.url || null,
                sourceData.imageUrl || null,
                sourceData.crawlTime instanceof Date ? sourceData.crawlTime : new Date(sourceData.crawlTime || Date.now())
            ];

            const result = await query<{ insertId: number }>(sql, params);

            // 返回新建的來源資訊
            const selectSql = 'SELECT * FROM offender_sources WHERE id = ?';
            const sources = await query<SourceInfo[]>(selectSql, [result.insertId]);

            if (sources.length === 0) {
                throw new Error('創建來源資訊後無法取得資料');
            }

            return sources[0];
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
            const sql = `
                SELECT * FROM offender_sources
                WHERE offender_id = ?
                ORDER BY crawl_time DESC
            `;
            return await query<SourceInfo[]>(sql, [offenderId]);
        } catch (error: any) {
            logger.error(`取得資料來源失敗: ${error.message}`);
            throw error;
        }
    }
}

// 為了相容性考慮，也提供與原 MongoDB 模型相似的介面
export const OffenderRecord = OffenderRecordModel;
