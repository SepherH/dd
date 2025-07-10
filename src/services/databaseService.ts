import { knex } from '../database/knexConfig';
import { logger } from '../utils/logger';
import type { Knex } from 'knex';

// 定義資料庫記錄介面
interface OffenderRecord {
  id?: string;
  name: string;
  id_number?: string;
  birth_date?: Date | null;
  gender?: string;
  address?: string;
  violation_count?: number;
  license_number?: string;
  vehicle_number?: string;
  status?: string;
  source?: string;
  remarks?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface ViolationRecord {
  id?: string;
  offender_id: string;
  violation_date: Date | null;
  location?: string;
  bac_level?: number | null;
  bac_unit?: string;
  violation_type?: string;
  penalty?: string;
  handling_agency?: string;
  case_number?: string;
  source_document?: string;
  details?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * 儲存酒駕累犯資料到資料庫
 * @param offenders 酒駕累犯資料陣列
 * @param source 資料來源
 */
export async function saveOffendersToDatabase(offenders: any[], source: string = 'taichung'): Promise<void> {
  if (!offenders.length) {
    console.log('沒有資料需要儲存');
    return;
  }

  console.log(`準備將 ${offenders.length} 筆資料存入資料庫...`);
  
  try {
    // 開始事務
    await knex.transaction(async (trx: Knex.Transaction) => {
      for (const offender of offenders) {
        try {
          // 檢查是否已存在相同的違規者（根據姓名和違規日期）
          const existingOffender = await trx('offenders')
            .where('name', '=', offender.name)
            .first() as OffenderRecord | undefined;
          
          let offenderId: string;
          
          if (existingOffender) {
            // 更新現有違規者
            offenderId = existingOffender.id as string;
            // 更新違規次數和相關欄位
            await trx('offenders')
              .where('id', offenderId)
              .update({
                violation_count: knex.raw('violation_count + 1') as any,
                updated_at: new Date(),
                source: source
              });
          } else {
            // 插入新違規者
            const result = await trx('offenders').insert({
              id: undefined, // 讓資料庫自動生成 UUID
              name: offender.name,
              violation_count: 1,
              status: 'active',
              source: source,
              created_at: new Date(),
              updated_at: new Date()
            });
            
            // 取得插入的ID (根據資料庫驅動程序可能需要調整)
            offenderId = typeof result[0] === 'number' ? result[0].toString() : result[0];
          }
          
          // 插入違規記錄
          await trx('violations').insert<Partial<ViolationRecord>>({
            id: undefined, // 讓資料庫自動生成 UUID
            offender_id: offenderId,
            violation_date: offender.violationDate ? new Date(offender.violationDate) : null,
            location: offender.violationLocation,
            violation_type: offender.violationArticle,
            details: offender.violationDescription,
            source_document: source,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`儲存違規者 ${offender.name} 資料時發生錯誤: ${errorMessage}`);
          // 繼續處理下一筆資料
          continue;
        }
      }
    });
    
    console.log('資料已成功儲存到資料庫');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`儲存資料到資料庫時發生錯誤: ${errorMessage}`);
    throw error;
  }
}

/**
 * 從資料庫中獲取所有酒駕累犯資料
 * @param limit 限制返回的資料筆數
 * @param offset 偏移量（用於分頁）
 * @returns 酒駕累犯資料陣列
 */
export async function getOffendersFromDatabase(limit: number = 100, offset: number = 0): Promise<any[]> {
  try {
    // 定義返回類型的介面
    interface OffenderWithViolations extends OffenderRecord {
      violation_date: Date | null;
      location: string | undefined;
      violation_type: string | undefined;
      details: string | undefined;
    }

    const offenders = (await knex
      .select([
        'offenders.*',
        'violations.violation_date',
        'violations.location',
        'violations.violation_type',
        'violations.details'
      ])
      .from('offenders')
      .leftJoin('violations', function(this: any) {
        this.on('offenders.id', '=', 'violations.offender_id');
      })
      .limit(limit || 100)
      .offset(offset || 0)
      .orderBy('offenders.name', 'asc')
      .orderBy('violations.violation_date', 'desc')) as Array<OffenderRecord & {
        violation_date: Date | null;
        location: string | undefined;
        violation_type: string | undefined;
        details: string | undefined;
      }>;
    
    return offenders;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`從資料庫獲取資料時發生錯誤: ${errorMessage}`);
    throw error;
  }
}

/**
 * 根據姓名搜索酒駕累犯資料
 * @param name 要搜索的姓名
 * @returns 符合條件的酒駕累犯資料陣列
 */
export async function searchOffendersByName(name: string): Promise<any[]> {
  try {
    // 定義返回類型的介面
    interface OffenderWithViolations extends OffenderRecord {
      violation_date: Date | null;
      location: string | undefined;
      violation_type: string | undefined;
      details: string | undefined;
    }

    const offenders = (await knex
      .select([
        'offenders.*',
        'violations.violation_date',
        'violations.location',
        'violations.violation_type',
        'violations.details'
      ])
      .from('offenders')
      .leftJoin('violations', function(this: any) {
        this.on('offenders.id', '=', 'violations.offender_id');
      })
      .where('offenders.name', 'like', `%${name}%`)
      .orderBy('offenders.name', 'asc')
      .orderBy('violations.violation_date', 'desc')) as Array<OffenderRecord & {
        violation_date: Date | null;
        location: string | undefined;
        violation_type: string | undefined;
        details: string | undefined;
      }>;
    
    return offenders;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`搜索酒駕累犯資料時發生錯誤: ${errorMessage}`);
    throw error;
  }
}
