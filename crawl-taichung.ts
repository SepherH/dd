#!/usr/bin/env bun
/**
 * 臺中市交通事件裁決處酒駕累犯爬蟲執行腳本
 */

import { TaichungDuiCrawler } from './src/crawler/taichungDuiCrawler';

async function main() {
  console.log('===== 臺中市交通事件裁決處酒駕累犯資料爬蟲 =====');
  
  const crawler = new TaichungDuiCrawler();
  await crawler.run();
}

main().catch(err => {
  console.error('爬蟲執行失敗:', err);
  process.exit(1);
});
