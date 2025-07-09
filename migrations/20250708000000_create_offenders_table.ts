/**
 * 創建酒駕累犯主表
 */
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('offenders', table => {
    table.increments('id').unsigned().primary();
    table.string('name', 50).notNullable().comment('累犯姓名');
    table.string('id_number', 20).nullable().comment('身分證字號（如有）');
    table.string('license_plate', 20).nullable().comment('車牌號碼（如有）');
    table.enum('gender', ['male', 'female']).nullable().comment('性別');
    table.date('violation_date').nullable().comment('違規日期');
    table.string('case_number', 50).nullable().comment('裁決字號');
    table.text('raw_data').nullable().comment('原始資料（JSON 字串）');
    table.string('source', 100).notNullable().comment('資料來源名稱');
    table.string('source_url', 255).nullable().comment('來源網址');
    table.string('image_url', 255).nullable().comment('圖片網址（如資料來自圖片）');
    table.datetime('crawl_time').notNullable().comment('爬取時間');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).comment('建立時間');
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')).comment('更新時間');

    // 添加索引以提高查詢效能
    table.index('name', 'idx_name');
    table.index('id_number', 'idx_id_number');
    table.index('license_plate', 'idx_license_plate');
    table.index('violation_date', 'idx_violation_date');
    table.index('case_number', 'idx_case_number');
    table.index('source', 'idx_source');
    table.index(['name', 'id_number'], 'idx_name_id');
    table.index(['name', 'license_plate'], 'idx_name_license');

    // 設定字符集和排序規則在 MariaDB 連接設置中完成
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('offenders');
}
