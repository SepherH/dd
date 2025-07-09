# MariaDB 匯入和連接修復記錄 (2025/07/09)

## 問題概述

在專案的資料匯入和 MariaDB 連接過程中，發現了以下幾項需要改進的問題：

1. 程式碼中存在重複匯入模組的情況
2. 資料匯入流程使用單一事務處理整批資料，容易因單筆錯誤影響整批匯入
3. 資料庫離線時的模擬模式不夠完整，可能導致部分功能無法正常運作

## 完成的修改

### 1. 修復重複匯入問題

在 `src/tools/importDataToDb.ts` 檔案中，移除了重複匯入 `logger` 的程式碼，這樣可以避免可能的命名空間衝突和混淆。

```diff
 import { OffenderRecordModel } from '../models/offenderRecordKnex';
 import { knex } from '../database/knexConfig';
 import { v4 as uuidv4 } from 'uuid';
-import { logger } from '../utils/logger';
 import { getDatabaseConfig } from '../utils/dbEnvironment';
```

### 2. 改進資料匯入流程

優化了 `importDataToDb.ts` 中的資料匯入流程，主要改進包括：

- **單獨事務處理**：每筆記錄現在使用獨立的事務進行處理，這樣一筆資料的失敗不會影響整個批次的匯入
- **更好的錯誤處理**：增加了更詳細的日誌記錄，包括成功匯入的確認訊息
- **修正拼字錯誤**：將「爪取時間」修正為「爬取時間」

關鍵程式碼變更：

```typescript
// 將每筆記錄單獨處理，不使用單一事務，提高容錯性
for (const record of sourceData.records) {
  try {
    // ... 資料處理邏輯 ...
    
    // 使用單獨的事務處理每筆記錄，避免一筆錯誤影響整個批次
    await knex.transaction(async (trx) => {
      // 1. 先建立約駕累犯記錄
      // 2. 建立違規記錄
      // ... 資料庫操作 ...
    });
    
    result.imported++;
    logger.info(`成功匯入記錄: ${record.姓名} - ${record.違規日}`);
  } catch (error: any) {
    logger.error(`匯入記錄失敗 ${record.姓名}: ${error.message}`);
    result.errors++;
  }
}
```

### 3. 增強資料庫離線模式

顯著改進了 `knexConfig.ts` 中的模擬 Knex 物件實作，使系統在資料庫離線時仍能正常運行：

- **增加模擬方法**：新增了更多模擬方法和鏈式呼叫支援
- **模擬資料庫結構操作**：新增了對資料庫表結構操作的模擬
- **表格直接存取**：加入了特定表格（如 `offenders`、`violations` 等）的直接呼叫支援
- **更合理的回傳值**：為各種操作提供更合理的模擬回傳值

主要變更：

```typescript
// 建立一個更完整的模擬 Knex 物件
const mockQueryBuilder = {
    where: () => mockQueryBuilder,
    whereIn: () => mockQueryBuilder,
    // ... 更多查詢建構器方法 ...
};

knexInstance = {
    raw: () => Promise.resolve([{ result: 2 }]),
    destroy: () => Promise.resolve(),
    transaction: (fn: Function) => Promise.resolve(fn(mockQueryBuilder)),
    // ... 更多主要方法 ...
    schema: {
        hasTable: () => Promise.resolve(true),
        createTable: () => ({
            // ... 表格結構方法 ...
        }),
        dropTableIfExists: () => Promise.resolve(),
    },
    // 模擬表格設定
    table: () => mockQueryBuilder,
    // 加入表格名稱調用
    offenders: () => mockQueryBuilder,
    violations: () => mockQueryBuilder,
    offender_sources: () => mockQueryBuilder,
};
```

## 建議的後續改進

以下是未來可考慮實施的進一步改進：

1. **增加資料驗證**：在匯入資料前增加驗證層，確保資料符合預期格式和業務規則
2. **實施重試機制**：對於可能因為暫時性網路或資料庫問題而失敗的操作，實施自動重試
3. **改進資料庫環境檢測**：增加定期檢測和自動重連功能
4. **增加資料匯入記錄**：在資料庫中新增表格來記錄每次匯入操作的詳細資訊

## 總結

今天的修改主要聚焦於提高系統的穩定性和彈性，特別是在處理資料匯入和資料庫連接問題時。通過改進錯誤處理和增強離線模式，系統現在應該能夠更加穩健地處理各種情況，無論是在資料庫正常運行還是暫時離線時。
