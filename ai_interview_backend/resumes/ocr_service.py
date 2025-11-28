# resumes/ocr_service.py
"""
PDF OCR 服务
使用 PaddleOCR 从扫描版 PDF 中提取文本
"""
import os
from typing import Optional
from paddleocr import PaddleOCR
from pdf2image import convert_from_path
import tempfile

# 全局 OCR 实例（延迟初始化）
_ocr_instance: Optional[PaddleOCR] = None


def get_ocr_instance() -> PaddleOCR:
    """
    获取或创建 PaddleOCR 实例（单例模式）
    """
    global _ocr_instance
    if _ocr_instance is None:
        print("[INFO] 初始化 PaddleOCR...")
        _ocr_instance = PaddleOCR(
            use_angle_cls=True,  # 使用方向分类器
            lang='ch',  # 中文识别，如需英文可改为 'en'
            use_gpu=False,  # 如果有 GPU 可设为 True
            show_log=False,  # 不显示详细日志
            # 使用 PP-OCRv5 server 模型（精度更高）
            det_model_dir=None,  # 使用默认检测模型
            rec_model_dir=None,  # 使用默认识别模型
            cls_model_dir=None,  # 使用默认分类模型
        )
        print("[INFO] PaddleOCR 初始化完成")
    return _ocr_instance


def extract_text_from_pdf_with_ocr(pdf_path: str) -> str:
    """
    使用 OCR 从 PDF 文件中提取文本
    
    Args:
        pdf_path: PDF 文件路径
        
    Returns:
        提取的文本内容
    """
    try:
        print(f"[INFO] 开始 OCR 识别: {pdf_path}")
        
        # 1. 将 PDF 转换为图片
        print("[INFO] 将 PDF 转换为图片...")
        images = convert_from_path(
            pdf_path,
            dpi=200,  # 分辨率，越高越清晰但处理越慢
            fmt='jpeg',
            thread_count=2  # 并行处理
        )
        print(f"[INFO] 共转换 {len(images)} 页")
        
        # 2. 获取 OCR 实例
        ocr = get_ocr_instance()
        
        # 3. 对每一页进行 OCR 识别
        all_text = []
        for i, image in enumerate(images):
            print(f"[INFO] 识别第 {i+1}/{len(images)} 页...")
            
            # 将 PIL Image 保存到临时文件
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                image.save(tmp_file.name, 'JPEG')
                tmp_path = tmp_file.name
            
            try:
                # 执行 OCR
                result = ocr.ocr(tmp_path, cls=True)
                
                # 提取文本
                if result and result[0]:
                    page_text = []
                    for line in result[0]:
                        if line[1]:  # line[1] 是 (text, confidence)
                            text = line[1][0]
                            confidence = line[1][1]
                            # 只保留置信度较高的文本
                            if confidence > 0.5:
                                page_text.append(text)
                    
                    page_content = '\n'.join(page_text)
                    all_text.append(page_content)
                    print(f"[INFO] 第 {i+1} 页识别完成，提取 {len(page_text)} 行文本")
                else:
                    print(f"[WARNING] 第 {i+1} 页未识别到文本")
                    
            finally:
                # 删除临时文件
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        # 4. 合并所有页面的文本
        final_text = '\n\n'.join(all_text)
        print(f"[INFO] OCR 完成，总共提取 {len(final_text)} 个字符")
        
        return final_text
        
    except Exception as e:
        print(f"[ERROR] OCR 识别失败: {e}")
        import traceback
        traceback.print_exc()
        return ""


def extract_text_from_image_with_ocr(image_path: str) -> str:
    """
    使用 OCR 从图片文件中提取文本
    
    Args:
        image_path: 图片文件路径
        
    Returns:
        提取的文本内容
    """
    try:
        print(f"[INFO] 开始 OCR 识别图片: {image_path}")
        
        # 获取 OCR 实例
        ocr = get_ocr_instance()
        
        # 执行 OCR
        result = ocr.ocr(image_path, cls=True)
        
        # 提取文本
        if result and result[0]:
            text_lines = []
            for line in result[0]:
                if line[1]:
                    text = line[1][0]
                    confidence = line[1][1]
                    if confidence > 0.5:
                        text_lines.append(text)
            
            final_text = '\n'.join(text_lines)
            print(f"[INFO] 图片 OCR 完成，提取 {len(text_lines)} 行文本")
            return final_text
        else:
            print("[WARNING] 未识别到文本")
            return ""
            
    except Exception as e:
        print(f"[ERROR] 图片 OCR 识别失败: {e}")
        import traceback
        traceback.print_exc()
        return ""
