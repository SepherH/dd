import PyPDF2
import re
from pprint import pprint

# 開啟PDF檔案
with open('taichung_dui_list.pdf', 'rb') as pdf_file:
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    
    # 取得頁數
    num_pages = len(pdf_reader.pages)
    print(f"PDF 共有 {num_pages} 頁")
    
    # 讀取前2頁的內容
    for page_num in range(min(2, num_pages)):
        page = pdf_reader.pages[page_num]
        text = page.extract_text()
        
        print(f"\n===== 第 {page_num+1} 頁內容 =====")
        print(text[:1000])  # 只顯示前1000個字元
        
    # 嘗試解析資料結構（假設是表格形式）
    # 這只是一個簡單的解析示例，實際情況可能需要根據PDF的具體結構調整
    sample_page = pdf_reader.pages[0]
    sample_text = sample_page.extract_text()
    
    print("\n\n===== 嘗試解析資料結構 =====")
    
    # 以換行符分隔文本
    lines = sample_text.split('\n')
    
    # 顯示前10行資料，幫助了解結構
    print("前10行資料:")
    for i, line in enumerate(lines[:10]):
        print(f"{i}: {line}")
