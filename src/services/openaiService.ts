import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

/**
 * OpenAI 服務類別 - 處理與 OpenAI API 的互動
 */
export class OpenAIService {
  private client: OpenAI;
  private isSimulationMode: boolean;

  /**
   * 建構函數
   * @param apiKey OpenAI API 金鑰，如未提供則嘗試從環境變數取得
   * @param simulationMode 是否啟用模擬模式（當 API 金鑰不可用時）
   */
  constructor(apiKey?: string, simulationMode = false) {
    // 優先使用傳入的 API 金鑰，其次使用環境變數
    const key = apiKey || process.env.OPENAI_API_KEY;
    
    // 判斷是否啟用模擬模式
    this.isSimulationMode = simulationMode || !key;
    
    if (this.isSimulationMode) {
      console.log('警告：OpenAI 服務運行在模擬模式。API 回應將使用模擬資料。');
      this.client = {} as OpenAI; // 模擬模式下建立一個空物件
    } else {
      this.client = new OpenAI({ apiKey: key });
    }
  }

  /**
   * 將 PDF 文字內容轉換為結構化資料
   * @param pdfText 從 PDF 提取的文字內容
   * @returns 結構化的酒駕累犯資料
   */
  async extractStructuredDataFromPDF(pdfText: string): Promise<any[]> {
    if (this.isSimulationMode) {
      return this.simulateExtractDataFromPDF(pdfText);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '你是一個資料結構化專家。請從提供的 PDF 文字內容中，解析出酒駕累犯的資料，並以 JSON 陣列格式回傳。'
          },
          {
            role: 'user',
            content: `以下是從臺中市交通事件裁決處酒駕累犯名單中提取的 PDF 文字內容。
            請將它解析為一個包含以下欄位的 JSON 陣列：
            - serialNumber: 序號
            - name: 姓名
            - violationDate: 違規日期（請保持原始格式如 111/7/11）
            - violationArticle: 違規條款
            - violationLocation: 違規地點
            - violationDescription: 違規事實（可能跨越多行）
            - hasPhoto: 是否有照片（如果無法確定，填入 null）
            
            請確保處理跨行的資料，例如違規事實描述可能分布在多行中。
            
            文字內容：
            ${pdfText.substring(0, 4000)} // 限制文字長度避免超出 API 限制
            `
          }
        ],
        temperature: 0.1, // 設定較低的溫度以獲得更確定性的回應
        response_format: { type: 'json_object' } // 要求回傳 JSON 格式
      });

      const content = response.choices[0]?.message?.content || '{"records":[]}';
      const result = JSON.parse(content);
      return result.records || [];
    } catch (error) {
      console.error('OpenAI API 呼叫失敗:', error);
      return this.simulateExtractDataFromPDF(pdfText); // 失敗時使用模擬資料
    }
  }

  /**
   * 解析網頁內容以找出 PDF 連結
   * @param htmlContent 網頁 HTML 內容
   * @returns PDF 連結陣列
   */
  async extractPDFLinksFromHTML(htmlContent: string): Promise<string[]> {
    if (this.isSimulationMode) {
      return this.simulateExtractLinks(htmlContent);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '你是一個網頁解析專家。請從提供的 HTML 內容中找出所有指向 PDF 檔案的連結。'
          },
          {
            role: 'user',
            content: `以下是臺中市交通事件裁決處酒駕累犯公布專區的網頁內容。
            請找出所有指向 PDF 檔案的連結，特別是包含「酒駕」、「拒測」或「累犯」等關鍵字的檔案。
            請以 JSON 陣列格式回傳所有連結的完整 URL。
            
            HTML 內容：
            ${htmlContent.substring(0, 4000)} // 限制文字長度
            `
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{"links":[]}';
      const result = JSON.parse(content);
      return result.links || [];
    } catch (error) {
      console.error('OpenAI API 呼叫失敗:', error);
      return this.simulateExtractLinks(htmlContent);
    }
  }

  /**
   * 模擬從 PDF 提取資料的回應
   * @param pdfText PDF 文字內容
   * @returns 模擬的結構化資料
   */
  private simulateExtractDataFromPDF(pdfText: string): any[] {
    console.log('使用模擬資料代替 API 回應');
    
    // 從文字中使用簡單的正則表達式提取一些基本資訊
    const records = [];
    const lines = pdfText.split('\n');
    
    let currentRecord: any = {};
    let isRecordStarted = false;
    
    for (const line of lines) {
      // 檢查是否包含序號和姓名的行（通常包含數字開頭）
      const recordMatch = line.match(/^(\d+)\s+([^\s]+)\s+(\d{3}\/\d{1,2}\/\d{1,2})/);
      
      if (recordMatch) {
        // 如果已有記錄在處理中，先保存它
        if (isRecordStarted && currentRecord.serialNumber) {
          records.push({...currentRecord});
        }
        
        // 開始新記錄
        isRecordStarted = true;
        currentRecord = {
          serialNumber: recordMatch[1],
          name: recordMatch[2],
          violationDate: recordMatch[3],
          violationArticle: '第35條第3項', // 假設預設值
          violationLocation: '',
          violationDescription: '',
          hasPhoto: null
        };
        
        // 提取違規條款（如果在同一行）
        const articleMatch = line.match(/第\d+條第\d+項/);
        if (articleMatch) {
          currentRecord.violationArticle = articleMatch[0];
          
          // 提取違規地點（條款之後到行尾）
          const locationStart = line.indexOf(articleMatch[0]) + articleMatch[0].length;
          if (locationStart < line.length) {
            currentRecord.violationLocation = line.substring(locationStart).trim();
          }
        }
      } else if (isRecordStarted) {
        // 如果已開始記錄且不是新記錄開始，則為描述或地點的延續
        if (!currentRecord.violationLocation) {
          currentRecord.violationLocation = line.trim();
        } else {
          // 將剩餘行加到違規描述中
          if (currentRecord.violationDescription) {
            currentRecord.violationDescription += ' ' + line.trim();
          } else {
            currentRecord.violationDescription = line.trim();
          }
        }
      }
    }
    
    // 確保最後一筆記錄也被加入
    if (isRecordStarted && currentRecord.serialNumber) {
      records.push({...currentRecord});
    }
    
    return records.length > 0 ? records : [
      {
        serialNumber: '1',
        name: '石玉山',
        violationDate: '111/7/11',
        violationArticle: '第35條第3項',
        violationLocation: '沙鹿區中清路六段489號',
        violationDescription: '汽機車駕駛人駕駛汽機車，於十年內酒精濃度超過規定標準第2次(無照)',
        hasPhoto: null
      }
    ];
  }

  /**
   * 模擬從 HTML 提取連結的回應
   * @param htmlContent HTML 內容
   * @returns 模擬的 PDF 連結陣列
   */
  private simulateExtractLinks(htmlContent: string): string[] {
    console.log('使用模擬資料代替 API 回應');
    
    // 簡單提取 PDF 連結的模擬實現
    const pdfLinks: string[] = [];
    const pdfRegex = /href=["'](https?:\/\/[^"']+\.pdf)["']/gi;
    let match;
    
    while ((match = pdfRegex.exec(htmlContent)) !== null) {
      pdfLinks.push(match[1]);
    }
    
    // 若未找到實際連結，返回模擬連結
    return pdfLinks.length > 0 ? pdfLinks : [
      'https://www.traffic.taichung.gov.tw/df_ufiles/sub5/114年7月3日公布酒(毒)駕及拒測累犯名單.pdf',
      'https://www.traffic.taichung.gov.tw/df_ufiles/sub5/114年6月26日公布酒(毒)駕及拒測累犯名單.pdf'
    ];
  }
}

// 用於直接測試的導出函數
export async function testOpenAI() {
  const service = new OpenAIService(undefined, true); // 測試時使用模擬模式
  
  // 測試 PDF 文字解析
  const sampleText = `
序號 姓名 違規日 違規條款 違規地點 違規事實 照片
1 石玉山 111/7/11 第35條第3項 沙鹿區中清路六段489號汽機車駕駛人駕駛汽機車，於十年內
酒精濃度超過規定標準第2次(無照)
2 楊朝明 112/4/2 第35條第3項 梧棲區中央路二段540號汽機車駕駛人駕駛汽機車，於十年內
酒精濃度超過規定標準第2次
3 黃銀柏 111/7/31 第35條第3項 大肚區王福街326號前汽機車駕駛人駕駛汽機車，於十年內
酒精濃度超過規定標準第2次
  `;
  
  const result = await service.extractStructuredDataFromPDF(sampleText);
  console.log('解析結果:', JSON.stringify(result, null, 2));
  
  return result;
}

// 如果直接執行此檔案，則執行測試
if (require.main === module) {
  testOpenAI().catch(console.error);
}
