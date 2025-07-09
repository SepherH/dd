/**
 * MongoDB 到 MariaDB 資料遷移腳本
 * 用於將現有的 MongoDB 資料遷移至 MariaDB
 */

import mongoose from 'mongoose';
import { query } from './connection';
import { logger } from '../utils/logger';
import { config } from 'dotenv';
import { OffenderRecord as OffenderRecordModel } from '../models/offenderRecord';

// 載入環境變數
config();

// MongoDB 舊資料模型定義
const SourceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String },
    imageUrl: { type: String },
    crawlTime: { type: Date, required: true }
});

const OffenderRecordSchema = new mongoose.Schema({
    name: { type: String, required: true },
    idNumber: { type: String },
    licensePlate: { type: String },
    gender: { type: String, enum: ['male', 'female', null], default: null },
    violationDate: { type: Date },
    caseNumber: { type: String },
    sources: { type: [SourceSchema], required: true },
    rawData: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const MongoOffenderRecord = mongoose.models.OffenderRecord || 
    mongoose.model('OffenderRecord', OffenderRecordSchema);

/**
 * 遷移單一筆酒駕累犯記錄至 MariaDB
 * @param mongoRecord MongoDB 記錄物件
 * @returns 成功返回新記錄 ID，失敗返回 null
 */
async function migrateRecord(mongoRecord: any): Promise<number | null> {
    try {
        // 準備基本資料
        const record = mongoRecord.toObject();
        const mainSource = record.sources.length > 0 ? record.sources[0] : null;
        
        // 檢查記錄是否已存在（依姓名和身分證或車牌比對）
        let existingId: number | null = null;
        
        if (record.idNumber) {
            const existingSql = `SELECT id FROM offenders WHERE name = ? AND id_number = ? LIMIT 1`;
            const existingResult = await query<any[]>(existingSql, [record.name, record.idNumber]);
            if (existingResult.length > 0) {
                existingId = existingResult[0].id;
            }
        } else if (record.licensePlate) {
            const existingSql = `SELECT id FROM offenders WHERE name = ? AND license_plate = ? LIMIT 1`;
            const existingResult = await query<any[]>(existingSql, [record.name, record.licensePlate]);
            if (existingResult.length > 0) {
                existingId = existingResult[0].id;
            }
        }
        
        // 如果記錄已存在，則更新現有記錄
        if (existingId) {
            logger.debug(`記錄 ${record.name} 已存在，ID: ${existingId}，進行更新`);
            
            // 更新主記錄
            const updateSql = `
                UPDATE offenders 
                SET 
                    gender = IFNULL(?, gender),
                    violation_date = IFNULL(?, violation_date),
                    case_number = IFNULL(?, case_number),
                    raw_data = IFNULL(?, raw_data),
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            await query(updateSql, [
                record.gender,
                record.violationDate ? new Date(record.violationDate).toISOString().split('T')[0] : null,
                record.caseNumber,
                record.rawData,
                existingId
            ]);
            
            // 遷移資料來源
            if (mainSource) {
                await migrateSource(existingId, mainSource);
            }
            
            // 遷移其他資料來源
            if (record.sources.length > 1) {
                for (let i = 1; i < record.sources.length; i++) {
                    await migrateSource(existingId, record.sources[i]);
                }
            }
            
            return existingId;
        }
        
        // 如果記錄不存在，則新增記錄
        const insertSql = `
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
                crawl_time,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            record.name,
            record.idNumber || null,
            record.licensePlate || null,
            record.gender || null,
            record.violationDate ? new Date(record.violationDate).toISOString().split('T')[0] : null,
            record.caseNumber || null,
            record.rawData || null,
            mainSource ? mainSource.name : '未知來源',
            mainSource && mainSource.url ? mainSource.url : null,
            mainSource && mainSource.imageUrl ? mainSource.imageUrl : null,
            mainSource && mainSource.crawlTime ? new Date(mainSource.crawlTime).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
            record.createdAt ? new Date(record.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
            record.updatedAt ? new Date(record.updatedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')
        ];

        const result = await query<{insertId: number}>(insertSql, params);
        const newRecordId = result.insertId;
        
        // 遷移其他資料來源（若有）
        if (record.sources.length > 1) {
            for (let i = 1; i < record.sources.length; i++) {
                await migrateSource(newRecordId, record.sources[i]);
            }
        }
        
        logger.debug(`成功建立新記錄 ${record.name}，ID: ${newRecordId}`);
        return newRecordId;
    } catch (error: any) {
        logger.error(`遷移記錄失敗: ${error.message}`, { error });
        return null;
    }
}

/**
 * 遷移資料來源
 * @param offenderId 酒駕累犯記錄 ID
 * @param source 來源資料
 * @returns 是否成功
 */
async function migrateSource(offenderId: number, source: any): Promise<boolean> {
    try {
        // 檢查來源是否已存在
        const checkSql = `
            SELECT id FROM offender_sources 
            WHERE offender_id = ? AND name = ? AND crawl_time = ?
            LIMIT 1
        `;
        
        const crawlTime = source.crawlTime 
            ? new Date(source.crawlTime).toISOString().slice(0, 19).replace('T', ' ')
            : new Date().toISOString().slice(0, 19).replace('T', ' ');
            
        const existResult = await query<any[]>(checkSql, [offenderId, source.name, crawlTime]);
        
        if (existResult.length > 0) {
            logger.debug(`資料來源 ${source.name} 已存在，跳過`);
            return true;
        }
        
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
            source.name,
            source.url || null,
            source.imageUrl || null,
            crawlTime
        ];

        await query(sql, params);
        logger.debug(`成功新增資料來源 ${source.name}`);
        return true;
    } catch (error: any) {
        logger.error(`遷移資料來源失敗: ${error.message}`, { error });
        return false;
    }
}

/**
 * 執行完整資料遷移
 */
async function runMigration(): Promise<void> {
    let mongoConnection: mongoose.Connection | null = null;
    
    try {
        // 連線至 MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/drunk_driving_registry';
        mongoConnection = await mongoose.connect(mongoUri);
        logger.info('成功連線至 MongoDB');
        
        // 取得所有記錄
        const records = await MongoOffenderRecord.find({});
        logger.info(`從 MongoDB 取得了 ${records.length} 筆記錄`);
        
        // 批次處理記錄
        let successCount = 0;
        let failureCount = 0;
        
        for (let i = 0; i < records.length; i++) {
            const result = await migrateRecord(records[i]);
            if (result !== null) {
                successCount++;
            } else {
                failureCount++;
            }
            
            if ((i + 1) % 100 === 0 || i === records.length - 1) {
                logger.info(`遷移進度: ${i + 1}/${records.length} 筆記錄 (${Math.round((i + 1) * 100 / records.length)}%)`);
            }
        }
        
        logger.info(`遷移完成: 成功 ${successCount} 筆，失敗 ${failureCount} 筆`);
    } catch (error: any) {
        logger.error(`資料遷移發生錯誤: ${error.message}`, { error });
    } finally {
        // 關閉 MongoDB 連線
        if (mongoConnection) {
            await mongoose.disconnect();
            logger.info('MongoDB 連線已關閉');
        }
    }
}

// 如果直接執行此檔案，則進行遷移
if (require.main === module) {
    runMigration()
        .then(() => {
            logger.info('資料遷移程序執行完畢');
            process.exit(0);
        })
        .catch((error) => {
            logger.error(`資料遷移程序失敗: ${error.message}`, { error });
            process.exit(1);
        });
}

export { runMigration };
