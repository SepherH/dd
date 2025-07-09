/**
 * 創建酒駕累犯與資料來源的關聯表
 */
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('offender_sources', table => {
    table.increments('id').unsigned().primary();
    table.integer('offender_id').unsigned().notNullable().comment('關聯的累犯 ID');
    table.string('name', 100).notNullable().comment('來源名稱，例如：臺北監理所');
    table.string('url', 255).nullable().comment('來源網址');
    table.string('image_url', 255).nullable().comment('圖片網址（如果資料來自圖片）');
    table.datetime('crawl_time').notNullable().comment('爬取時間');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).comment('建立時間');
    
    // 外鍵關聯
    table.foreign('offender_id').references('id').inTable('offenders').onDelete('CASCADE');
    
    // 索引
    table.index('offender_id', 'idx_offender_id');
    table.index('name', 'idx_name');
    table.index('crawl_time', 'idx_crawl_time');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('offender_sources');
}
