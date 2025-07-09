/**
 * 統計資料控制器
 * 
 * 處理所有與統計資料相關的 API 請求
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

interface GenderDistribution {
    male: number;
    female: number;
    unknown: number;
}

interface SourceDistribution {
    source: string;
    count: number;
}

interface RegionStat {
    region: string;
    count: number;
}

interface DateStat {
    date: string;
    count: number;
}

interface OverviewData {
    totalCount: number;
    recentCount: number;
    genderDistribution: GenderDistribution;
    sourceDistribution: SourceDistribution[];
}

export const statisticsController = {
    /**
     * 取得整體統計概況
     * @param req Express 請求物件
     * @param res Express 回應物件
     * @param next Express 下一個處理函數
     */
    async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 取得總記錄數
            const totalCountResult = await query<[{total: number}]>('SELECT COUNT(*) as total FROM offenders');
            const totalCount = totalCountResult[0]?.total || 0;
            
            // 取得近 30 天的記錄數
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentCountResult = await query<[{total: number}]>(
                'SELECT COUNT(*) as total FROM offenders WHERE createdAt >= ?',
                [thirtyDaysAgo]
            );
            const recentCount = recentCountResult[0]?.total || 0;
            
            // 取得性別分布
            const genderStatsResult = await query<Array<{gender: string, count: number}>>(
                'SELECT gender, COUNT(*) as count FROM offenders GROUP BY gender'
            );
            
            // 格式化性別分布資料
            const genderDistribution: GenderDistribution = {
                male: 0,
                female: 0,
                unknown: 0
            };
            
            genderStatsResult.forEach(stat => {
                if (stat.gender === 'male') {
                    genderDistribution.male = stat.count;
                } else if (stat.gender === 'female') {
                    genderDistribution.female = stat.count;
                } else {
                    genderDistribution.unknown += stat.count;
                }
            });
            
            // 取得來源分布
            const sourceStatsResult = await query<Array<{source: string, count: number}>>(
                'SELECT source, COUNT(*) as count FROM offenders GROUP BY source ORDER BY count DESC'
            );
            
            // 格式化來源分布資料
            const sourceDistribution = sourceStatsResult.map(stat => ({
                source: stat.source || '未知來源',
                count: stat.count
            }));
            
            const overviewData: OverviewData = {
                totalCount,
                recentCount,
                genderDistribution,
                sourceDistribution
            };
            
            res.json({
                status: 'success',
                data: overviewData
            });
        } catch (error: any) {
            logger.error(`取得統計概況失敗: ${error.message}`);
            next(error);
        }
    },
    
    /**
     * 取得依地區分類的統計資料
     * @param req Express 請求物件
     * @param res Express 回應物件
     * @param next Express 下一個處理函數
     */
    async getByRegion(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 依來源監理所分類統計
            const regionStatsResult = await query<Array<{region: string, count: number}>>(
                'SELECT source as region, COUNT(*) as count FROM offenders GROUP BY source ORDER BY count DESC'
            );
            
            const regionStats: RegionStat[] = regionStatsResult.map(stat => ({
                region: stat.region || '未知地區',
                count: stat.count
            }));
            
            res.json({
                status: 'success',
                data: regionStats
            });
        } catch (error: any) {
            logger.error(`取得地區統計失敗: ${error.message}`);
            next(error);
        }
    },
    
    /**
     * 取得依日期分類的統計資料
     * @param req Express 請求物件
     * @param res Express 回應物件
     * @param next Express 下一個處理函數
     */
    async getByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;
            const interval = req.query.interval as string || 'month';
            
            // 設定日期範圍和參數
            const params: any[] = [];
            let dateQuery = '';
            
            if (startDate) {
                dateQuery += 'violationDate >= ?';
                params.push(new Date(startDate));
            } else {
                // 預設過去一年
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                dateQuery += 'violationDate >= ?';
                params.push(oneYearAgo);
            }
            
            if (endDate) {
                dateQuery += ' AND violationDate <= ?';
                params.push(new Date(endDate));
            } else {
                dateQuery += ' AND violationDate <= ?';
                params.push(new Date());
            }
            
            // 設定日期分組格式，使用 MariaDB 的日期函數
            let dateFormat;
            switch (interval) {
                case 'day':
                    dateFormat = "DATE_FORMAT(violationDate, '%Y-%m-%d')";
                    break;
                case 'week':
                    dateFormat = "CONCAT(YEAR(violationDate), '-W', WEEK(violationDate))";
                    break;
                case 'year':
                    dateFormat = "DATE_FORMAT(violationDate, '%Y')";
                    break;
                case 'month':
                default:
                    dateFormat = "DATE_FORMAT(violationDate, '%Y-%m')";
                    break;
            }
            
            // 依日期統計
            const dateStatsQuery = `
                SELECT ${dateFormat} as date, COUNT(*) as count 
                FROM offenders 
                WHERE ${dateQuery} 
                GROUP BY date 
                ORDER BY date ASC
            `;
            
            const dateStatsResult = await query<Array<{date: string, count: number}>>(dateStatsQuery, params);
            
            const dateStats: DateStat[] = dateStatsResult.map(stat => ({
                date: stat.date || '未知日期',
                count: stat.count
            }));
            
            res.json({
                status: 'success',
                data: dateStats
            });
        } catch (error: any) {
            logger.error(`取得日期統計失敗: ${error.message}`);
            next(error);
        }
    }
};
