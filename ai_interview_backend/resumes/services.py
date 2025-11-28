# resumes/services.py
import os
from django.conf import settings
from docx import Document
from pypdf import PdfReader
from .ocr_service import extract_text_from_pdf_with_ocr

def extract_text_from_file(file_path: str) -> str:
    """
    根据文件扩展名，从 PDF 或 DOCX 文件中提取纯文本。

    :param file_path: 文件在服务器上的完整物理路径。
    :return: 提取出的纯文本内容。
    """
    # 从文件名中获取扩展名
    _, extension = os.path.splitext(file_path)
    extension = extension.lower()

    try:
        if extension == '.pdf':
            return extract_text_from_pdf(file_path)
        elif extension == '.docx':
            return extract_text_from_docx(file_path)
        else:
            print(f"不支持的文件类型: {extension}")
            return ""
    except Exception as e:
        print(f"从文件 {file_path} 提取文本时出错: {e}")
        return ""

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    使用 pypdf 从 PDF 文件中提取文本。
    如果提取失败（扫描版 PDF），则自动使用 OCR。
    """
    text = ""
    try:
        # 第一步：尝试直接提取文本
        with open(pdf_path, 'rb') as f:
            reader = PdfReader(f)
            print(f"[DEBUG] PDF 总页数: {len(reader.pages)}")
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                print(f"[DEBUG] 第 {i+1} 页提取文本长度: {len(page_text)}")
                text += page_text
        print(f"[DEBUG] PDF 总文本长度: {len(text)}")
        
        # 第二步：如果文本为空，使用 OCR
        if not text.strip():
            print("[INFO] PDF 文件是扫描版，启动 OCR 识别...")
            text = extract_text_from_pdf_with_ocr(pdf_path)
            if text.strip():
                print(f"[INFO] OCR 成功提取 {len(text)} 个字符")
            else:
                print("[WARNING] OCR 也未能提取到文本")
                
    except Exception as e:
        print(f"[ERROR] 解析 PDF 时出错: {e}")
        import traceback
        traceback.print_exc()
    return text

def extract_text_from_docx(docx_path: str) -> str:
    """
    使用 python-docx 从 DOCX 文件中提取文本。
    """
    doc = Document(docx_path)
    text = "\n".join([para.text for para in doc.paragraphs])
    return text