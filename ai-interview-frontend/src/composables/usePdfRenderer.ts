import { ref, watch, type Ref } from 'vue';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PdfPage {
  canvas: HTMLCanvasElement;
  pageNum: number;
}

export function usePdfRenderer(options: {
  pdfBase64: Ref<string | null>;
  scale?: number;
}) {
  const { pdfBase64, scale = 2 } = options;

  const pages = ref<PdfPage[]>([]);
  const pageCount = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let abortController: AbortController | null = null;

  function base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function renderPage(
    pdfDoc: PDFDocumentProxy,
    pageNum: number
  ): Promise<HTMLCanvasElement> {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    return canvas;
  }

  async function render() {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const { signal } = abortController;

    const base64 = pdfBase64.value;
    if (!base64) {
      pages.value = [];
      pageCount.value = 0;
      loading.value = false;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;
    pages.value = [];

    try {
      const buffer = base64ToBuffer(base64);
      const pdfDoc = await getDocument({ data: buffer }).promise;

      if (signal.aborted) return;
      pageCount.value = pdfDoc.numPages;

      // Render first page immediately
      if (pdfDoc.numPages > 0) {
        const canvas = await renderPage(pdfDoc, 1);
        if (signal.aborted) return;
        pages.value = [{ canvas, pageNum: 1 }];
      }

      // Render remaining pages progressively
      for (let i = 2; i <= pdfDoc.numPages; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (signal.aborted) return;

        const canvas = await renderPage(pdfDoc, i);
        if (signal.aborted) return;
        pages.value = [...pages.value, { canvas, pageNum: i }];
      }

      loading.value = false;
    } catch (err: any) {
      if (err.name === 'AbortError' || signal.aborted) return;
      error.value = err.message || 'PDF 渲染失败';
      loading.value = false;
    }
  }

  watch(pdfBase64, () => render(), { immediate: true });

  return { pages, pageCount, loading, error };
}
