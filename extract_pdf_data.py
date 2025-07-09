#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import re
import PyPDF2
from datetime import datetime
import argparse

class DuiPdfExtractor:
    """酒駕資料PDF解析器"""
    
    def __init__(self, pdf_dir, output_dir):
        """
        初始化PDF解析器
        
        Args:
            pdf_dir: PDF檔案所在目錄
            output_dir: 輸出目錄
        """
        self.pdf_dir = pdf_dir
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def find_all_pdfs(self):
        """查找所有PDF檔案"""
        all_pdfs = []
        
        # 遍歷目錄找到所有PDF檔案
        for root, dirs, files in os.walk(self.pdf_dir):
            for file in files:
                if file.lower().endswith('.pdf'):
                    all_pdfs.append(os.path.join(root, file))
        
        print(f"找到 {len(all_pdfs)} 個PDF檔案")
        return all_pdfs
    
    def extract_single_pdf(self, pdf_path):
        """
        提取單一PDF檔案的資料
        
        Args:
            pdf_path: PDF檔案路徑
            
        Returns:
            dict: 包含提取資料的字典
        """
        filename = os.path.basename(pdf_path)
        print(f"處理檔案: {filename}")
        
        result = {
            "filename": filename,
            "source_path": pdf_path,
            "extraction_date": datetime.now().isoformat(),
            "records": [],
            "metadata": {}
        }
        
        # 從檔名提取日期
        date_match = re.search(r'(\d+)年(\d+)月(\d+)日', filename)
        if date_match:
            year, month, day = date_match.groups()
            result["metadata"]["publish_date"] = f"{year}-{month}-{day}"
            result["metadata"]["year"] = year
            result["metadata"]["month"] = month
            result["metadata"]["day"] = day
        
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                num_pages = len(pdf_reader.pages)
                result["metadata"]["page_count"] = num_pages
                
                # 提取所有頁面的文字
                full_text = ""
                for page_num in range(num_pages):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    full_text += page_text + "\n\n"
                
                # 儲存原始文字內容
                result["raw_text"] = full_text
                
                # 初步解析表格資料
                self.parse_table_data(full_text, result)
                
        except Exception as e:
            print(f"處理檔案 {filename} 時發生錯誤: {e}")
            result["error"] = str(e)
        
        return result
    
    def parse_table_data(self, text, result):
        """
        解析表格資料
        
        Args:
            text: 提取的文字內容
            result: 結果字典，將直接修改
        """
        # 分割為行
        lines = text.split('\n')
        
        # 尋找表頭 - 臺中市酒駕累犯檔案使用「序號 姓名 違規日 違規條款 違規地點 違規事實」格式
        header_index = -1
        for i, line in enumerate(lines):
            if "序號" in line and "姓名" in line and "違規" in line:
                header_index = i
                result["metadata"]["header"] = line
                break
        
        if header_index == -1:
            print(f"警告: 無法找到表頭，嘗試使用序號+姓名模式識別")
            # 第二種方式: 尋找數字序號加姓名的模式
            records = self.parse_without_header(lines)
            result["records"] = records
            result["metadata"]["record_count"] = len(records)
            return
        
        # 解析表格資料
        current_record = {}
        records = []
        
        for line in lines[header_index+1:]:
            # 跳過空行和頁碼
            if not line.strip() or re.match(r'^\d+$', line.strip()):
                continue
                
            # 檢測是否為新記錄 - 通常以序號(數字)開始
            if re.match(r'^\d+\s+[\u4e00-\u9fff]{2,3}', line):
                if current_record:  # 儲存前一筆記錄
                    records.append(current_record)
                
                # 新記錄初始化
                current_record = {"raw_line": line}
                
                # 提取各欄位資料
                fields = line.split()
                if len(fields) >= 2:
                    current_record["序號"] = fields[0]
                    current_record["姓名"] = fields[1]
                
                # 提取違規日期 - 格式如 111/7/11
                date_match = re.search(r'(\d+)/(\d+)/(\d+)', line)
                if date_match:
                    year, month, day = date_match.groups()
                    current_record["違規日"] = f"{year}/{month}/{day}"
                
                # 提取違規條款 - 通常為「第X條第Y項」格式
                clause_match = re.search(r'第(\d+)條第(\d+)項', line)
                if clause_match:
                    article, paragraph = clause_match.groups()
                    current_record["違規條款"] = f"第{article}條第{paragraph}項"
                
                # 提取違規地點 - 通常在違規條款之後
                if clause_match:
                    location_start = clause_match.end()
                    next_keyword = re.search(r'汽機車駕駛人', line[location_start:])
                    if next_keyword:
                        location = line[location_start:location_start + next_keyword.start()].strip()
                        current_record["違規地點"] = location
                
                # 提取違規事實
                fact_match = re.search(r'汽機車駕駛人駕駛汽機車，於十年內(.*)$', line)
                if fact_match:
                    current_record["違規事實"] = "汽機車駕駛人駕駛汽機車，於十年內" + fact_match.group(1)
            elif current_record:
                # 如果這行是上一記錄的續行
                # 優先添加到違規事實欄位
                if "違規事實" in current_record:
                    current_record["違規事實"] += " " + line.strip()
                else:
                    # 否則作為附加資訊
                    current_record.setdefault("additional_info", []).append(line)
        
        # 添加最後一筆記錄
        if current_record:
            records.append(current_record)
        
        result["records"] = records
        result["metadata"]["record_count"] = len(records)
        
    def parse_without_header(self, lines):
        """
        在沒找到標準表頭的情況下嘗試解析記錄
        
        Args:
            lines: 文字內容按行分割的列表
            
        Returns:
            list: 解析出的記錄列表
        """
        records = []
        current_record = None
        
        for line in lines:
            # 跳過空行和頁碼
            if not line.strip() or re.match(r'^\d+$', line.strip()):
                continue
                
            # 識別新記錄的模式: 數字序號 + 姓名(2-3個中文字)
            record_start_match = re.match(r'^(\d+)\s+([\u4e00-\u9fff]{2,3})', line)
            if record_start_match:
                if current_record:
                    records.append(current_record)
                
                seq_num, name = record_start_match.groups()
                current_record = {
                    "序號": seq_num,
                    "姓名": name,
                    "raw_line": line
                }
                
                # 提取違規日期
                date_match = re.search(r'(\d+)/(\d+)/(\d+)', line)
                if date_match:
                    current_record["違規日"] = date_match.group(0)
                
                # 提取違規條款
                clause_match = re.search(r'第(\d+)條第(\d+)項', line)
                if clause_match:
                    current_record["違規條款"] = clause_match.group(0)
                
                # 檢查是否有酒駕相關關鍵字
                if "酒精濃度" in line:
                    current_record["違規類型"] = "酒駕"
                elif "拒絕測試" in line:
                    current_record["違規類型"] = "拒測"
                elif "吸食毒品" in line or "毒品" in line:
                    current_record["違規類型"] = "毒駕"
            elif current_record:
                # 將其它行添加為違規事實的延伸或附加資訊
                if "違規事實" in current_record:
                    current_record["違規事實"] += " " + line.strip()
                else:
                    current_record["違規事實"] = line.strip()
        
        # 添加最後一筆記錄
        if current_record:
            records.append(current_record)
            
        return records
    
    def process_all_pdfs(self):
        """處理所有PDF檔案並輸出結果"""
        pdf_files = self.find_all_pdfs()
        all_results = []
        
        for pdf_path in pdf_files:
            result = self.extract_single_pdf(pdf_path)
            all_results.append(result)
            
            # 生成單一PDF的輸出檔案名
            output_basename = os.path.splitext(os.path.basename(pdf_path))[0]
            output_path = os.path.join(self.output_dir, f"{output_basename}.json")
            
            # 輸出單一PDF的結果
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            print(f"已輸出結果至: {output_path}")
        
        # 輸出所有結果的摘要
        summary = {
            "total_pdfs": len(pdf_files),
            "extraction_date": datetime.now().isoformat(),
            "pdf_summaries": []
        }
        
        for result in all_results:
            summary["pdf_summaries"].append({
                "filename": result["filename"],
                "record_count": result.get("metadata", {}).get("record_count", 0),
                "has_error": "error" in result
            })
        
        summary_path = os.path.join(self.output_dir, "extraction_summary.json")
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        print(f"\n摘要報告已輸出至: {summary_path}")
        print(f"共處理了 {len(pdf_files)} 個PDF檔案，提取了 {sum(s['record_count'] for s in summary['pdf_summaries'])} 筆記錄")

def main():
    parser = argparse.ArgumentParser(description='酒駕資料PDF解析器')
    parser.add_argument('--pdf_dir', default='data/processed', help='PDF檔案所在目錄')
    parser.add_argument('--output_dir', default='data/extracted', help='輸出目錄')
    args = parser.parse_args()
    
    extractor = DuiPdfExtractor(args.pdf_dir, args.output_dir)
    extractor.process_all_pdfs()

if __name__ == "__main__":
    main()
