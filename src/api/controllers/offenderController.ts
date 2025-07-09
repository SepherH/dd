/**
 * 酒駕累犯資料控制器
 * 
 * 處理所有與酒駕累犯資料相關的 API 請求
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';
import { PaginationResponse } from '../../types';

// 定義 Offender 介面
export interface Offender {
    id: number;
    name: string;
    gender: string | null;
    idNumber: string | null;
    licensePlate: string | null;
    violationDate: Date | string | null;
    caseNumber: string | null;
    source: string | null;
    sourceUrl: string | null;
    imageUrl: string | null;
    crawlTime: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export const offenderController = {
    /**
     * 列出所有酒駕累犯資料
     * @param req Express 請求物件
     * @param res Express 回應物件
     * @param next Express 下一個處理函數
     */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = (page - 1) * limit;
            
            // 使用 MariaDB 取得分頁資料
            const offendersQuery = `
                SELECT * FROM offenders
                ORDER BY updatedAt DESC
                LIMIT ? OFFSET ?
            `;
            
            const offenders = await query<Offender[]>(offendersQuery, [limit, offset]);
            
            // 取得總記錄數
            const totalQuery = 'SELECT COUNT(*) as total FROM offenders';
            const totalResult = await query<{total: number}[]>(totalQuery);
            const total = totalResult[0]?.total || 0;
            
            // 計算分頁資訊
            const totalPages = Math.ceil(total / limit);
            
            const response: PaginationResponse<Offender> = {
                status: 'success',
                data: offenders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
            
            res.json(response);
        } catch (error: any) {
            logger.error(`列出酒駕累犯資料失敗: ${error.message}`);
            next(error);
        }
    },
    
    /**
     * 根據 ID 取得單筆酒駕累犯資料
     * @param req Express 請求物件
     * @param res Express 回應物件
     * @param next Express 下一個處理函數
     */
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id;
            
            // 使用 MariaDB 查詢單一筆資料
            const offenderQuery = 'SELECT * FROM offenders WHERE id = ?';
            const offenders = await query<Offender[]>(offenderQuery, [id]);
            
            if (!offenders || offenders.length === 0) {
                res.status(404).json({
                    status: 'error',
                    message: '找不到指定的酒駕累犯資料'
                });
                return;
            }
            
            res.json({
                status: 'success',
                data: offenders[0]
            });
        } catch (error: any) {
            logger.error(`取得酒駕累犯資料失敗: ${error.message}`);
            next(error);
        }
    },
    
    /**
     * 搜尋酒駕累犯資料
     * @param req Express 請求物件
     * @param res Express 回應物件
     * @param next Express 下一個處理函數
     */
    async search(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, idNumber, licensePlate, startDate, endDate } = req.query;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = (page - 1) * limit;
            
            // 建立查詢條件
            let whereClause = '1=1'; // 始終為真的條件
            const params: any[] = [];
            
            // 姓名搜尋（使用 LIKE 以支援部分匹配）
            if (name) {
                whereClause += ' AND name LIKE ?';
                params.push(`%${name}%`);
            }
            
            // 身分證字號搜尋（完全匹配）
            if (idNumber) {
                whereClause += ' AND idNumber = ?';
                params.push((idNumber as string).toUpperCase());
            }
            
            // 車牌號碼搜尋（完全匹配）
            if (licensePlate) {
                whereClause += ' AND licensePlate = ?';
                params.push((licensePlate as string).toUpperCase());
            }
            
            // 日期範圍搜尋
            if (startDate) {
                whereClause += ' AND violationDate >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                whereClause += ' AND violationDate <= ?';
                params.push(endDate);
            }
            
            // 執行查詢
            const offendersQuery = `
                SELECT * FROM offenders 
                WHERE ${whereClause}
                ORDER BY updatedAt DESC
                LIMIT ? OFFSET ?
            `;
            
            // 添加分頁參數
            params.push(limit);
            params.push(offset);
            
            const offenders = await query<Offender[]>(offendersQuery, params);
            
            // 取得總記錄數
            const totalQuery = `SELECT COUNT(*) as total FROM offenders WHERE ${whereClause}`;
            const totalResult = await query<{total: number}[]>(totalQuery, params.slice(0, params.length - 2));
            const total = totalResult[0]?.total || 0;
            
            // 計算分頁資訊
            const totalPages = Math.ceil(total / limit);
            
            const response: PaginationResponse<Offender> = {
                status: 'success',
                data: offenders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
            
            res.json(response);
        } catch (error: any) {
            logger.error(`搜尋酒駕累犯資料失敗: ${error.message}`);
            next(error);
        }
    }
};
