/**
 * 初始資料表結構遷移檔
 * 
 * 建立系統所需的基本資料表
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // 檢查資料表是否已存在，如果不存在則建立

    // 1. 酒駕累犯資料表
    if (!(await knex.schema.hasTable('offenders'))) {
        await knex.schema.createTable('offenders', (table) => {
            table.uuid('id').primary().notNullable().comment('唯一識別碼');
            table.string('name', 100).notNullable().comment('姓名');
            table.string('id_number', 20).notNullable().comment('身分證字號').index();
            table.date('birth_date').comment('出生日期');
            table.string('gender', 10).comment('性別');
            table.string('address', 500).comment('住址');
            table.integer('violation_count').defaultTo(0).comment('違規次數');
            table.string('license_number', 50).comment('駕照號碼').index();
            table.string('vehicle_number', 50).comment('車牌號碼').index();
            table.string('status', 20).defaultTo('active').comment('狀態');
            table.string('source', 100).comment('資料來源');
            table.text('remarks').comment('備註');
            table.timestamp('created_at').defaultTo(knex.fn.now()).comment('建立時間');
            table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('更新時間');
        });
        console.log('已建立 offenders 資料表');
    }

    // 2. 違規紀錄資料表
    if (!(await knex.schema.hasTable('violations'))) {
        await knex.schema.createTable('violations', (table) => {
            table.uuid('id').primary().notNullable().comment('唯一識別碼');
            table.uuid('offender_id').notNullable().comment('關聯的累犯 ID').index();
            table.date('violation_date').notNullable().comment('違規日期');
            table.string('location', 500).comment('違規地點');
            table.decimal('bac_level', 5, 2).comment('酒精濃度');
            table.string('bac_unit', 20).defaultTo('mg/L').comment('酒精濃度單位');
            table.string('violation_type', 50).comment('違規類型');
            table.string('penalty', 500).comment('處罰結果');
            table.string('handling_agency', 100).comment('處理機關');
            table.string('case_number', 100).comment('案件編號').index();
            table.string('source_document', 500).comment('來源文件');
            table.text('details').comment('詳細內容');
            table.timestamp('created_at').defaultTo(knex.fn.now()).comment('建立時間');
            table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('更新時間');
            
            // 外鍵約束
            table.foreign('offender_id').references('id').inTable('offenders').onDelete('CASCADE');
        });
        console.log('已建立 violations 資料表');
    }

    // 3. 文件資料表
    if (!(await knex.schema.hasTable('documents'))) {
        await knex.schema.createTable('documents', (table) => {
            table.uuid('id').primary().notNullable().comment('唯一識別碼');
            table.string('title', 200).notNullable().comment('文件標題');
            table.string('file_path', 500).comment('檔案路徑');
            table.string('document_type', 50).comment('文件類型');
            table.uuid('related_offender').comment('關聯的累犯 ID').index();
            table.uuid('related_violation').comment('關聯的違規 ID').index();
            table.string('source', 100).comment('來源');
            table.date('document_date').comment('文件日期');
            table.text('content').comment('文件內容');
            table.text('extracted_text').comment('提取的文字');
            table.string('status', 20).defaultTo('pending').comment('處理狀態');
            table.timestamp('created_at').defaultTo(knex.fn.now()).comment('建立時間');
            table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('更新時間');
            
            // 外鍵約束
            table.foreign('related_offender').references('id').inTable('offenders').onDelete('SET NULL');
            table.foreign('related_violation').references('id').inTable('violations').onDelete('SET NULL');
        });
        console.log('已建立 documents 資料表');
    }

    // 4. 資料來源配置表
    if (!(await knex.schema.hasTable('data_sources'))) {
        await knex.schema.createTable('data_sources', (table) => {
            table.increments('id').primary().comment('唯一識別碼');
            table.string('name', 100).notNullable().comment('來源名稱');
            table.string('url', 500).comment('來源網址');
            table.string('crawler_type', 20).comment('爬蟲類型');
            table.string('config', 1000).comment('爬蟲配置');
            table.timestamp('last_crawled_at').comment('上次爬取時間');
            table.boolean('is_active').defaultTo(true).comment('是否啟用');
            table.text('remarks').comment('備註');
            table.timestamp('created_at').defaultTo(knex.fn.now()).comment('建立時間');
            table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('更新時間');
        });
        console.log('已建立 data_sources 資料表');
    }

    // 5. 使用者資料表
    if (!(await knex.schema.hasTable('users'))) {
        await knex.schema.createTable('users', (table) => {
            table.uuid('id').primary().notNullable().comment('唯一識別碼');
            table.string('username', 50).notNullable().unique().comment('使用者名稱');
            table.string('password', 100).notNullable().comment('密碼');
            table.string('email', 100).unique().comment('電子郵件');
            table.string('role', 20).defaultTo('user').comment('角色');
            table.boolean('is_active').defaultTo(true).comment('是否啟用');
            table.timestamp('last_login').comment('上次登入時間');
            table.timestamp('created_at').defaultTo(knex.fn.now()).comment('建立時間');
            table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('更新時間');
        });
        console.log('已建立 users 資料表');
    }
}

export async function down(knex: Knex): Promise<void> {
    // 移除所有建立的資料表，順序要注意外鍵約束
    await knex.schema.dropTableIfExists('documents');
    await knex.schema.dropTableIfExists('violations');
    await knex.schema.dropTableIfExists('offenders');
    await knex.schema.dropTableIfExists('data_sources');
    await knex.schema.dropTableIfExists('users');
}
