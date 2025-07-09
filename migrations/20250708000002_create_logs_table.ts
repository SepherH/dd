/**
 * 創建日誌記錄表
 */
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('logs', table => {
    table.increments('id').unsigned().primary();
    table.string('level', 10).notNullable().comment('日誌等級（debug, info, warn, error）');
    table.text('message').notNullable().comment('日誌訊息');
    table.jsonb('metadata').nullable().comment('額外的中繼資料');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).comment('記錄時間');
    
    // 索引
    table.index('level', 'idx_level');
    table.index('created_at', 'idx_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('logs');
}
