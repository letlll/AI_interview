import { ref } from 'vue';
import type { Ref } from 'vue';
import { ElLoading, ElMessage } from 'element-plus';

type PreExportHook = () => Promise<void> | void;

const ELECTRON_PDF_URL = 'http://localhost:9999';

export interface PdfPreviewData {
  blob: Blob;
  pageCount: number;
  pageImages: string[];
}

async function checkElectronHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ELECTRON_PDF_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

function serializeDocument(): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;

  // 移除不需要的元素
  clone.querySelectorAll('script, .el-loading-mask, .el-overlay, .el-dialog__wrapper, .el-drawer__wrapper, .el-message, .el-notification')
    .forEach(el => el.remove());

  // 展开折叠区域（面试回溯等）
  clone.querySelectorAll('.el-collapse-item.is-disabled .el-collapse-item__wrap')
    .forEach(el => ((el as HTMLElement).style.display = 'block'));

  return '<!DOCTYPE html>' + clone.outerHTML;
}

export function useExport(elementRef: Ref<HTMLElement | null>, filename: string) {
  const isExporting = ref(false);

  const generatePdfBlob = async (
    preExportHook?: PreExportHook,
    onProgress?: (text: string) => void
  ): Promise<PdfPreviewData | null> => {
    if (!(await checkElectronHealth())) {
      ElMessage.error('PDF 导出需要 Electron 桌面端运行');
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
      await new Promise(resolve => setTimeout(resolve, 300));

      onProgress?.('正在生成 PDF...');
      const html = serializeDocument();

      const res = await fetch(`${ELECTRON_PDF_URL}/api/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, options: { resumeName: filename } }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '未知错误' }));
        throw new Error(err.error || `Electron PDF 服务返回 ${res.status}`);
      }

      const data = await res.json();
      const pdfBytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      return {
        blob,
        pageCount: data.pageCount,
        pageImages: data.pageImages || [],
      };
    } catch (error: any) {
      console.error('导出 PDF 失败:', error);
      ElMessage.error(error.message || '导出 PDF 失败，请稍后重试');
      return null;
    } finally {
      isExporting.value = false;
      loadingInstance.close();
    }
  };

  const exportToPdf = async (preExportHook?: PreExportHook) => {
    const data = await generatePdfBlob(preExportHook);
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
