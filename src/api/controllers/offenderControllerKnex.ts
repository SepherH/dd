/**
 * 酒駕累犯控制器 (使用 Knex.js 實現)
 */

import { OffenderRecordModel } from '../../models/offenderRecordKnex';
import { logger } from '../../utils/logger';

export class OffenderController {
  /**
   * 獲取酒駕累犯列表
   */
  static async getOffenders(req: Request): Promise<Response> {
    try {
      // 解析查詢參數
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;
      
      // 獲取記錄
      const records = await OffenderRecordModel.findAll({
        limit,
        offset,
        orderBy: 'updated_at',
        order: 'desc'
      });
      
      // 獲取總記錄數
      const total = await OffenderRecordModel.count();
      
      return new Response(
        JSON.stringify({
          success: true,
          data: records,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error: any) {
      logger.error(`獲取酒駕累犯列表失敗: ${error.message}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '獲取酒駕累犯列表失敗',
          message: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  /**
   * 根據 ID 獲取酒駕累犯記錄
   */
  static async getOffenderById(req: Request, id: number): Promise<Response> {
    try {
      const record = await OffenderRecordModel.findById(id);
      
      if (!record) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: '未找到指定記錄' 
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // 獲取資料來源
      const sources = await OffenderRecordModel.getSources(id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...record,
            sources
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error: any) {
      logger.error(`獲取酒駕累犯記錄失敗: ${error.message}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '獲取酒駕累犯記錄失敗',
          message: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  /**
   * 搜尋酒駕累犯記錄
   */
  static async searchOffenders(req: Request): Promise<Response> {
    try {
      // 解析查詢參數
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;
      
      // 搜尋條件
      const name = url.searchParams.get('name') || undefined;
      const idNumber = url.searchParams.get('idNumber') || undefined;
      const licensePlate = url.searchParams.get('licensePlate') || undefined;
      const startDate = url.searchParams.get('startDate') || undefined;
      const endDate = url.searchParams.get('endDate') || undefined;
      
      // 執行搜尋
      const records = await OffenderRecordModel.find({
        name,
        idNumber,
        licensePlate,
        startDate,
        endDate,
        limit,
        offset
      });
      
      // 計算符合條件的總記錄數
      let totalCount = 0;
      
      // 建構 where 條件
      const whereClause: Record<string, any> = {};
      
      if (name) {
        // 模糊搜尋不能直接用在 count，先略過
        // whereClause.name = name; // 這不是精確匹配
      }
      
      if (idNumber) {
        whereClause.id_number = idNumber;
      }
      
      if (licensePlate) {
        whereClause.license_plate = licensePlate;
      }
      
      // 日期範圍需要特別處理，此處簡化處理
      
      totalCount = await OffenderRecordModel.count(whereClause);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: records,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }), 
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error: any) {
      logger.error(`搜尋酒駕累犯記錄失敗: ${error.message}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '搜尋酒駕累犯記錄失敗',
          message: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

export default OffenderController;
