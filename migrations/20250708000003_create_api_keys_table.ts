/**
 * 創建 API 金鑰表
 */
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('api_keys', table => {
    table.increments('id').unsigned().primary();
    table.string('key', 64).notNullable().comment('API 金鑰值');
    table.string('name', 100).notNullable().comment('金鑰名稱/用途');
    table.boolean('is_active').notNullable().defaultTo(true).comment('是否啟用');
    table.datetime('expires_at').nullable().comment('過期時間（如有）');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).comment('建立時間');
    table.timestamp('last_used_at').nullable().comment('最後使用時間');
    
    // 索引
    table.unique('key', 'idx_key');
    table.index('is_active', 'idx_is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('api_keys');
}
