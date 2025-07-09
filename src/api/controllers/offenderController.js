/**
 * 酒駕累犯資料控制器
 * 
 * 處理所有與酒駕累犯資料相關的 API 請求
 */

import { OffenderRecord } from '../../models/offenderRecord.js';
import { logger } from '../../utils/logger.js';

export const offenderController = {
  /**
   * 列出所有酒駕累犯資料
   * @param {express.Request} req 
   * @param {express.Response} res 
   * @param {express.NextFunction} next 
   */
  async list(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // 取得分頁資料
      const offenders = await OffenderRecord.find({})
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // 取得總記錄數
      const total = await OffenderRecord.countDocuments({});
      
      // 計算分頁資訊
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        status: 'success',
        data: offenders.map(o => o.toPublicJSON()),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      logger.error(`列出酒駕累犯資料失敗: ${error.message}`);
      next(error);
    }
  },
  
  /**
   * 根據 ID 取得單筆酒駕累犯資料
   * @param {express.Request} req 
   * @param {express.Response} res 
   * @param {express.NextFunction} next 
   */
  async getById(req, res, next) {
    try {
      const id = req.params.id;
      
      const offender = await OffenderRecord.findById(id);
      
      if (!offender) {
        return res.status(404).json({
          status: 'error',
          message: '找不到指定的酒駕累犯資料'
        });
      }
      
      res.json({
        status: 'success',
        data: offender.toPublicJSON()
      });
    } catch (error) {
      logger.error(`取得酒駕累犯資料失敗: ${error.message}`);
      next(error);
    }
  },
  
  /**
   * 搜尋酒駕累犯資料
   * @param {express.Request} req 
   * @param {express.Response} res 
   * @param {express.NextFunction} next 
   */
  async search(req, res, next) {
    try {
      const { name, idNumber, licensePlate, startDate, endDate, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // 建立查詢條件
      const query = {};
      
      // 姓名搜尋（使用正規表達式以支援部分匹配）
      if (name) {
        query.name = { $regex: name, $options: 'i' };
      }
      
      // 身分證字號搜尋（完全匹配）
      if (idNumber) {
        query.idNumber = idNumber.toUpperCase();
      }
      
      // 車牌號碼搜尋（完全匹配）
      if (licensePlate) {
        query.licensePlate = licensePlate.toUpperCase();
      }
      
      // 日期範圍搜尋
      if (startDate || endDate) {
        query.violationDate = {};
        if (startDate) {
          query.violationDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.violationDate.$lte = new Date(endDate);
        }
      }
      
      // 執行查詢
      const offenders = await OffenderRecord.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // 取得總記錄數
      const total = await OffenderRecord.countDocuments(query);
      
      // 計算分頁資訊
      const totalPages = Math.ceil(total / parseInt(limit));
      
      res.json({
        status: 'success',
        data: offenders.map(o => o.toPublicJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      logger.error(`搜尋酒駕累犯資料失敗: ${error.message}`);
      next(error);
    }
  }
};
