---
name: 创建 Test/test-pdf-api.html
overview: 在项目根目录创建 Test 文件夹，并放入一个完整的 HTML 测试页面，用于调用 Electron PDF 微服务 API。
todos:
  - id: create-test-html
    content: 创建 Test/test-pdf-api.html
    status: completed
isProject: false
---

## 目标

在 `Test/test-pdf-api.html` 创建独立测试页面，直接调用 `http://localhost:9999/api/preview`。

## 文件路径

`Test/test-pdf-api.html`

## 文件内容

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>PDF API 测试</title>
  <style>
    body { font-family: sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; background: #fafafa; }
    h1 { color: #333; }
    h2 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    textarea { width: 100%; height: 180px; font-family: monospace; font-size: 13px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    input { padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; }
    button { padding: 8px 16px; cursor: pointer; background: #409eff; color: #fff; border: none; border-radius: 4px; font-size: 14px; }
    button:hover { background: #66b1ff; }
    button:disabled { background: #a0cfff; cursor: not-allowed; }
    button.secondary { background: #909399; }
    #status { padding: 12px; margin: 10px 0; border-radius: 4px; font-size: 14px; }
    .success { background: #f0f9eb; color: #67c23a; border: 1px solid #c8e6c9; }
    .error   { background: #fef0f0; color: #f56c6c; border: 1px solid #fbc4c4; }
    .loading { background: #fdf6ec; color: #e6a23c; border: 1px solid #faecd8; }
    #previewImages { margin-top: 16px; }
    #previewImages img { max-width: 100%; border: 1px solid #ddd; margin: 8px 0; border-radius: 2px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .page-label { font-weight: bold; color: #409eff; margin-top: 16px; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow: auto; max-height: 200px; font-size: 12px; border: 1px solid #e8e8e8; }
    .info { background: #ecf5ff; padding: 10px; border-radius: 4px; color: #409eff; font-size: 13px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>PDF API 测试页面</h1>
  <div class="info">
    接口地址：<strong>POST http://localhost:9999/api/preview</strong><br>
    前置条件：Electron 微服务已启动（npm run electron:dev）
  </div>

  <h2>1. 参数配置</h2>
  <div style="margin-bottom: 12px;">
    <label><strong>resumeName:</strong>
      <input type="text" id="resumeName" value="测试简历" style="width:220px; margin-left:8px;">
    </label>
    &nbsp;
    <label><strong>页边距:</strong>
      <input type="number" id="marginTop" value="40" style="width:60px; margin-left:8px;" title="上">px
      <input type="number" id="marginBottom" value="40" style="width:60px;" title="下">px
      <input type="number" id="marginLeft" value="50" style="width:60px;" title="左">px
      <input type="number" id="marginRight" value="50" style="width:60px;" title="右">px
    </label>
  </div>

  <h2>2. HTML 内容（将被 Chromium 渲染）</h2>
  <textarea id="htmlInput" placeholder="在此粘贴 HTML..."></textarea>
  <br><br>
  <button onclick="sendRequest()" id="sendBtn">发送 POST /api/preview</button>
  <button onclick="loadSample()" class="secondary">加载示例</button>

  <h2>3. 请求状态</h2>
  <div id="status"></div>

  <h2>4. 预览图（Chromium 精确截图）</h2>
  <div id="previewImages"></div>

  <h2>5. 响应原始数据</h2>
  <pre id="response"></pre>

  <script>
    const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; width: 794px; margin: 0; padding: 40px; background: #fff; font-size: 14px; line-height: 1.6; color: #333; }
    h1 { text-align: center; color: #1a56db; font-size: 26px; margin: 0 0 6px; }
    .contact { text-align: center; color: #666; font-size: 13px; margin-bottom: 16px; }
    h2 { color: #1a56db; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin: 16px 0 8px; font-size: 15px; }
    ul { padding-left: 18px; margin: 0; }
    li { margin-bottom: 4px; }
    .item-header { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .item-title { font-weight: 600; }
    .item-date { color: #888; font-size: 12px; }
    .item-sub { color: #666; font-size: 12px; margin-bottom: 4px; }
    .section { margin-bottom: 14px; }
    .skills-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-item { background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>张三</h1>
  <p class="contact">手机: 13800138000 &nbsp;|&nbsp; 邮箱: zhangsan@example.com &nbsp;|&nbsp; 上海</p>

  <div class="section">
    <h2>工作经历</h2>
    <ul>
      <li>
        <div class="item-header"><span class="item-title">高级前端工程师</span><span class="item-date">2022-至今</span></div>
        <div class="item-sub">某科技有限公司</div>
        <ul>
          <li>负责前端技术选型与架构设计，主导 Vue3 + TypeScript 重构</li>
          <li>搭建前端 CI/CD 流水线，发布效率提升 60%</li>
          <li>管理 5 人前端团队，制定代码规范与评审流程</li>
        </ul>
      </li>
      <li style="margin-top:8px;">
        <div class="item-header"><span class="item-title">前端工程师</span><span class="item-date">2019-2022</span></div>
        <div class="item-sub">某互联网公司</div>
        <ul>
          <li>参与核心业务系统开发，负责订单模块前端实现</li>
          <li>优化首屏加载性能，LCP 从 4.2s 降至 1.8s</li>
        </ul>
      </li>
    </ul>
  </div>

  <div class="section">
    <h2>技能</h2>
    <ul class="skills-list">
      <li class="skill-item">Vue.js</li>
      <li class="skill-item">React</li>
      <li class="skill-item">TypeScript</li>
      <li class="skill-item">Node.js</li>
      <li class="skill-item">Python</li>
      <li class="skill-item">Electron</li>
      <li class="skill-item">Webpack</li>
    </ul>
  </div>

  <div class="section">
    <h2>教育背景</h2>
    <ul>
      <li>
        <div class="item-header"><span class="item-title">计算机科学与技术 · 学士</span><span class="item-date">2015-2019</span></div>
        <div class="item-sub">某985大学</div>
      </li>
    </ul>
  </div>
</body>
</html>`;

    document.getElementById('htmlInput').value = sampleHtml;

    function loadSample() {
      document.getElementById('htmlInput').value = sampleHtml;
    }

    async function sendRequest() {
      const btn = document.getElementById('sendBtn');
      const status = document.getElementById('status');
      const previewDiv = document.getElementById('previewImages');
      const responsePre = document.getElementById('response');

      btn.disabled = true;
      status.className = 'loading';
      status.textContent = '请求中，请等待 Chromium 渲染...';
      previewDiv.innerHTML = '';
      responsePre.textContent = '';

      const html = document.getElementById('htmlInput').value;
      const resumeName = document.getElementById('resumeName').value;
      const marginTop = parseInt(document.getElementById('marginTop').value) || 40;
      const marginBottom = parseInt(document.getElementById('marginBottom').value) || 40;
      const marginLeft = parseInt(document.getElementById('marginLeft').value) || 50;
      const marginRight = parseInt(document.getElementById('marginRight').value) || 50;

      try {
        const start = Date.now();
        const res = await fetch('http://localhost:9999/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
            options: {
              resumeName,
              marginTop,
              marginBottom,
              marginLeft,
              marginRight,
              displayHeader: true,
            }
          })
        });

        const elapsed = Date.now() - start;
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        status.className = 'success';
        status.textContent = `成功！${data.pageCount} 页，耗时 ${elapsed}ms`;

        // 预览图
        data.pageImages.forEach((img, i) => {
          const label = document.createElement('div');
          label.className = 'page-label';
          label.textContent = `第 ${i + 1} 页（共 ${data.pageCount} 页）`;
          previewDiv.appendChild(label);

          const imgEl = document.createElement('img');
          imgEl.src = img;
          imgEl.alt = `Page ${i + 1}`;
          previewDiv.appendChild(imgEl);
        });

        // 下载按钮
        if (data.pdfBase64) {
          const dlDiv = document.createElement('div');
          dlDiv.style.marginTop = '16px';
          const a = document.createElement('a');
          const bytes = atob(data.pdfBase64);
          const buf = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
          const blob = new Blob([buf], { type: 'application/pdf' });
          a.href = URL.createObjectURL(blob);
          a.download = `简历-${resumeName}.pdf`;
          a.style.cssText = 'display:inline-block;padding:10px 24px;background:#67c23a;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;';
          a.textContent = '下载 PDF（带页码 header/footer）';
          dlDiv.appendChild(a);
          previewDiv.appendChild(dlDiv);
        }

        // 响应信息
        responsePre.textContent = JSON.stringify({
          pageCount: data.pageCount,
          pageBreaks: data.pageBreaks,
          pdfBase64_length: data.pdfBase64 ? data.pdfBase64.length : 0,
          pageImages_count: data.pageImages.length,
        }, null, 2);

      } catch (err) {
        status.className = 'error';
        status.textContent = '失败: ' + err.message;
        responsePre.textContent = err.stack || err.message;
      } finally {
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>
```

## 验证步骤

1. 启动 Electron 微服务：`npm run electron:dev`（在 `ai-interview-frontend` 目录）
2. 浏览器打开 `Test/test-pdf-api.html`
3. 点击"加载示例" → "发送 POST /api/preview"
4. 确认出现多页预览图和 PDF 下载按钮

