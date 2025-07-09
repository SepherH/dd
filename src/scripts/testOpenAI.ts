/**
 * OpenAI API 金鑰測試腳本
 * 
 * 用於測試 OpenAI API 金鑰是否正確並且能夠成功呼叫 API
 */

import { aiService } from '../services/aiService';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

async function main() {
    try {
        logger.info('開始測試 OpenAI API 金鑰...');
        logger.info(`使用的 API 金鑰末尾為: ...${process.env.OPENAI_API_KEY?.slice(-5) || 'N/A'}`);

        // 測試文本分析功能
        const testText = `
            臺灣桃園地方法院民事裁定 112年度司促字第15613號
            聲　請　人 潘冠宏
            上列聲請人聲請對相對人張俊傑發支付命令事件，本院裁定如下：
            主  文
            相對人於收受本命令後二十日內，須向聲請人清償新臺幣參拾肆萬
            伍仟元，及自民國一百一十二年七月十八日起至清償日止，按年息
            百分之五計算之利息，並賠償程序費用新臺幣伍佰元。
            相對人如於收受本命令後二十日之不變期間內，不提出異議，本命
            令與確定判決有同一效力。
            理  由
            一、聲請意旨略以：聲請人為相對人酒駕車禍被害人，相對人有
                愛喝酒行為，已有五度遭法院判決有期徒刑。依民法第184條
                規定，請求相對人賠償醫療費用8,500元、看護費用250,000元
                、工作損失86,000元。
            二、聲請人主張之請求係為給付一定數量之金錢，並已提出相關證
                據，其請求依法律規定得以支付命令程序求償，核無不合，依
                民事訴訟法第508條第1項規定，裁定如主文。
            中    華    民    國   112    年    7    月    18    日
                    臺灣桃園地方法院民事庭
                               法  官  張雅玲
        `;

        logger.info('開始進行文字結構化測試...');
        const structuredData = await aiService.extractStructuredData(testText);
        logger.info('文字結構化測試完成，結果如下:');
        logger.info(JSON.stringify(structuredData, null, 2));

        // 測試語言檢測功能
        logger.info('開始進行語言檢測測試...');
        const language = await aiService.detectLanguage(testText);
        logger.info(`語言檢測測試完成，檢測結果: ${language}`);

        logger.info('OpenAI API 金鑰測試完成，金鑰可以正常使用！');
        process.exit(0);
    } catch (error: any) {
        logger.error(`OpenAI API 金鑰測試失敗: ${error.message}`);
        if (error.stack) {
            logger.error(error.stack);
        }
        process.exit(1);
    }
}

// 執行測試
main();
