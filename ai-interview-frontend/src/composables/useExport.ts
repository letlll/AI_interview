import { ref, nextTick } from 'vue';
import type { Ref } from 'vue';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ElLoading, ElMessage } from 'element-plus';

type PreExportHook = () => Promise<void> | void;

/** 返回类型：预览所需数据 */
export interface PdfPreviewData {
  blob: Blob;
  pageCount: number;
  pageImages: string[]; // 每页 base64 图片
}

export function useExport(elementRef: Ref<HTMLElement | null>, filename: string) {
  const isExporting = ref(false);

  /** 生成 PDF Blob（仅生成，不下载），返回页图片用于预览 */
  const generatePdfBlob = async (
    preExportHook?: PreExportHook,
    onProgress?: (text: string) => void
  ): Promise<PdfPreviewData | null> => {
    if (!elementRef.value) {
      console.warn('[useExport generatePdfBlob] elementRef 为空');
      ElMessage.error('无法找到要导出的内容');
      return null;
    }

    isExporting.value = true;
    const loadingInstance = ElLoading.service({
      lock: true,
      text: '正在准备导出内容...',
      background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
      if (preExportHook) await preExportHook();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 500));

      onProgress?.('正在逐页生成 PDF...');

      const el = elementRef.value;
      const scrollHeight = el.scrollHeight;
      const scrollWidth = el.scrollWidth;
      console.log('[useExport generatePdfBlob] html2canvas 参数', {
        scrollHeight,
        scrollWidth,
        clientHeight: el.clientHeight,
        clientWidth: el.clientWidth,
        offsetHeight: el.offsetHeight,
        offsetWidth: el.offsetWidth,
        elDisplay: getComputedStyle(el).display,
        elVisibility: getComputedStyle(el).visibility,
      });

      const pdf = new jsPDF('p', 'pt', 'a4');
      const a4Width = 595.28;
      const a4Height = 841.89;

      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: scrollHeight,
        windowHeight: scrollHeight,
        width: scrollWidth,
        windowWidth: scrollWidth,
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pageHeight = (imgWidth / a4Width) * a4Height;
      const pageImages: string[] = [];
      let position = 0;

      while (position < imgHeight) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = Math.min(pageHeight, imgHeight - position);
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, position, imgWidth, pageCanvas.height, 0, 0, imgWidth, pageCanvas.height);
          if (position > 0) pdf.addPage();
          pdf.addImage(
            pageCanvas.toDataURL('image/jpeg', 1.0),
            'JPEG', 0, 0,
            a4Width,
            (pageCanvas.height * a4Width) / imgWidth
          );
          // 保存每页图片用于预览
          pageImages.push(pageCanvas.toDataURL('image/jpeg', 0.9));
        }
        position += pageHeight;
      }

      const blob = pdf.output('blob');

      return { blob, pageCount: pageImages.length, pageImages };

    } catch (error) {
      console.error('导出 PDF 失败:', error);
      ElMessage.error('导出 PDF 失败，请稍后重试。');
      return null;
    } finally {
      isExporting.value = false;
      loadingInstance.close();
    }
  };

  /** 直接下载 PDF（保留原有方法，内部复用 generatePdfBlob） */
  const exportToPdf = async (preExportHook?: PreExportHook) => {
    console.log('[useExport exportToPdf] 入口', {
      hasElementRef: !!elementRef.value,
      scrollHeight: elementRef.value?.scrollHeight ?? -1,
      scrollWidth: elementRef.value?.scrollWidth ?? -1,
      clientHeight: elementRef.value?.clientHeight ?? -1,
      clientWidth: elementRef.value?.clientWidth ?? -1,
    });
    const data = await generatePdfBlob(preExportHook, (_text) => {
      // no-op：loading 已由 generatePdfBlob 管理
    });
    if (!data) return;
    const url = URL.createObjectURL(data.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { isExporting, exportToPdf, generatePdfBlob };
}