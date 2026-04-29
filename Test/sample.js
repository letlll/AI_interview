// 将示例 HTML 放在独立 .js 文件，避免模板字符串中的 </script> 被浏览器错误解析
window.SAMPLE_HTML = `<!DOCTYPE html>
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
  <p class="contact">手机: 13800138000 | 邮箱: zhangsan@example.com | 上海</p>
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
        <div class="item-header"><span class="item-title">计算机科学与技术 学士</span><span class="item-date">2015-2019</span></div>
        <div class="item-sub">某985大学</div>
      </li>
    </ul>
  </div>
</body>
</html>`;
