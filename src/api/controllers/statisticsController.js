/**
 * 統計資料控制器
 * 
 * 處理所有與統計資料相關的 API 請求
 */

import { OffenderRecord } from '../../models/offenderRecord.js';
import { logger } from '../../utils/logger.js';

export const statisticsController = {
  /**
   * 取得整體統計概況
   * @param {express.Request} req 
   * @param {express.Response} res 
   * @param {express.NextFunction} next 
   */
  async getOverview(req, res, next) {
    try {
      // 取得總記錄數
      const totalCount = await OffenderRecord.countDocuments({});
      
      // 取得近 30 天的記錄數
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCount = await OffenderRecord.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      // 取得性別分布
      const genderStats = await OffenderRecord.aggregate([
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // 格式化性別分布資料
      const genderDistribution = {
        male: 0,
        female: 0,
        unknown: 0
      };
      
      genderStats.forEach(stat => {
        if (stat._id === 'male') {
          genderDistribution.male = stat.count;
        } else if (stat._id === 'female') {
          genderDistribution.female = stat.count;
        } else {
          genderDistribution.unknown = stat.count;
        }
      });
      
      // 取得來源分布
      const sourceStats = await OffenderRecord.aggregate([
        { $unwind: '$sources' },
        {
          $group: {
            _id: '$sources.name',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      // 格式化來源分布資料
      const sourceDistribution = sourceStats.map(stat => ({
        source: stat._id,
        count: stat.count
      }));
      
      res.json({
        status: 'success',
        data: {
          totalCount,
          recentCount,
          genderDistribution,
          sourceDistribution
        }
      });
    } catch (error) {
      logger.error(`取得統計概況失敗: ${error.message}`);
      next(error);
    }
  },
  
  /**
   * 取得依地區分類的統計資料
   * @param {express.Request} req 
   * @param {express.Response} res 
   * @param {express.NextFunction} next 
   */
  async getByRegion(req, res, next) {
    try {
      // 依來源監理所分類統計
      const regionStats = await OffenderRecord.aggregate([
        { $unwind: '$sources' },
        {
          $group: {
            _id: '$sources.name',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      res.json({
        status: 'success',
        data: regionStats.map(stat => ({
          region: stat._id,
          count: stat.count
        }))
      });
    } catch (error) {
      logger.error(`取得地區統計失敗: ${error.message}`);
      next(error);
    }
  },
  
  /**
   * 取得依日期分類的統計資料
   * @param {express.Request} req 
   * @param {express.Response} res 
   * @param {express.NextFunction} next 
   */
  async getByDate(req, res, next) {
    try {
      const { startDate, endDate, interval = 'month' } = req.query;
      
      // 設定日期範圍
      const dateQuery = {};
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      } else {
        // 預設過去一年
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        dateQuery.$gte = oneYearAgo;
      }
      
      if (endDate) {
        dateQuery.$lte = new Date(endDate);
      } else {
        dateQuery.$lte = new Date();
      }
      
      // 設定日期分組格式
      let dateFormat;
      switch (interval) {
        case 'day':
          dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$violationDate' } };
          break;
        case 'week':
          dateFormat = {
            $concat: [
              { $toString: { $year: '$violationDate' } },
              '-W',
              { $toString: { $week: '$violationDate' } }
            ]
          };
          break;
        case 'year':
          dateFormat = { $dateToString: { format: '%Y', date: '$violationDate' } };
          break;
        case 'month':
        default:
          dateFormat = { $dateToString: { format: '%Y-%m', date: '$violationDate' } };
          break;
      }
      
      // 依日期統計
      const dateStats = await OffenderRecord.aggregate([
        {
          $match: {
            violationDate: dateQuery
          }
        },
        {
          $group: {
            _id: dateFormat,
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      res.json({
        status: 'success',
        data: dateStats.map(stat => ({
          date: stat._id || '未知日期',
          count: stat.count
        }))
      });
    } catch (error) {
      logger.error(`取得日期統計失敗: ${error.message}`);
      next(error);
    }
  }
};
