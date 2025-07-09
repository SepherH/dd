/**
 * API 金鑰種子資料
 */
import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // 清空表格，重新插入種子資料
  await knex("api_keys").del();
  
  // 插入種子資料
  await knex("api_keys").insert([
    {
      key: "test_api_key_123456789",
      name: "測試用 API 金鑰",
      is_active: true,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 一年後過期
      created_at: new Date(),
      last_used_at: null
    },
    {
      key: "development_key_987654321",
      name: "開發環境專用",
      is_active: true,
      expires_at: null, // 永不過期
      created_at: new Date(),
      last_used_at: null
    }
  ]);
}
