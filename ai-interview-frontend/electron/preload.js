/**
 * electron/preload.js
 *
 * 上下文隔离脚本：将安全的 API 暴露给渲染进程。
 * 注意：此文件在 Electron 上下文中运行，与前端 Vue 页面隔离。
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronPDF', {
  /**
   * 检查 Electron PDF 服务是否可用（健康检查）。
   * @returns {Promise<boolean>}
   */
  isAvailable: async () => {
    try {
      const res = await fetch('http://localhost:9999/health');
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * 调用 Electron 微服务生成 PDF。
   * @param {string} html 完整 HTML 字符串
   * @param {object} options { resumeName, marginTop, marginBottom, marginLeft, marginRight }
   * @returns {Promise<Blob|null>} PDF Blob，失败返回 null
   */
  generatePdf: async (html, options = {}) => {
    try {
      const res = await fetch('http://localhost:9999/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, options }),
      });
      if (!res.ok) throw new Error(await res.text());
      const buffer = await res.arrayBuffer();
      return new Blob([buffer], { type: 'application/pdf' });
    } catch (err) {
      console.warn('[electronPDF] 生成失败，将 fallback 到 html2canvas', err);
      return null;
    }
  },
});
