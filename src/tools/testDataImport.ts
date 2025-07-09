/**
 * 資料匯入測試工具
 * 
 * 使用環境偵測功能，測試將 JSON 資料匯入到 MariaDB 資料庫
 */

import path from 'path';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { importFileData, importDirectoryData } from './importDataToDb';
import { getDatabaseConfig, isInternalNetwork } from '../utils/dbEnvironment';

// 載入環境變數
dotenv.config();

async function main() {
    console.log('===============================================');
    console.log('資料匯入測試工具');
    console.log('===============================================');

    // 顯示網路環境
    const internalNetwork = isInternalNetwork();
    console.log(`目前網路環境: ${internalNetwork ? '內部網路' : '外部網路'}`);
    
    // 顯示資料庫設定
    const dbConfig = getDatabaseConfig();
    console.log(`資料庫連線設定: ${dbConfig.host}:${dbConfig.port}`);
    console.log('-----------------------------------------------');

    try {
        // 設定資料目錄
        const dataDir = path.join(process.cwd(), 'data', 'extracted');
        console.log(`準備匯入資料目錄: ${dataDir}`);

        // 匯入單一檔案示範
        if (process.argv.includes('--file')) {
            const sampleFilePath = path.join(
                dataDir, 
                '114年6月5日公布酒(毒)駕及拒測累犯名單_2025-07-09T09-20-13-155Z_114年6月5日公布酒(毒)駕及拒測累犯名單.json'
            );
            
            console.log(`正在匯入單一檔案: ${path.basename(sampleFilePath)}`);
            const result = await importFileData(sampleFilePath);
            console.log(`匯入結果: 總記錄 ${result.total} 筆, 成功 ${result.imported} 筆, 錯誤 ${result.errors} 筆`);
        } else {
            // 匯入整個目錄
            console.log(`正在匯入整個資料目錄...`);
            const result = await importDirectoryData(dataDir);
            console.log(`匯入結果: 處理 ${result.files} 個檔案, 總記錄 ${result.total} 筆, 成功 ${result.imported} 筆, 錯誤 ${result.errors} 筆`);
        }

        console.log('-----------------------------------------------');
        console.log('資料匯入測試完成');
    } catch (error: any) {
        console.error(`資料匯入測試失敗: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

// 執行主函數
main().catch(error => {
    console.error(`程式執行失敗: ${error.message}`);
    process.exit(1);
});
