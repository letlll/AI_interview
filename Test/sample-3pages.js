// 3页测试简历 HTML，用于验证 /api/preview 多页渲染和截图
window.SAMPLE_HTML_3PAGES = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: sans-serif;
      width: 794px;
      margin: 0;
      padding: 40px;
      background: #fff;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
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
    .summary { color: #444; font-size: 13px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>李明</h1>
  <p class="contact">手机: 13900139000 | 邮箱: liming@example.com | 北京</p>

  <div class="section">
    <h2>个人简介</h2>
    <p class="summary">
      10年互联网后端开发经验，擅长分布式系统设计与高并发服务优化。曾在某一线大厂主导交易系统重构，日均处理请求量从500万提升至3亿，稳定性达99.99%。对技术充满热情，乐于推动团队技术文化建设。
    </p>
  </div>

  <div class="section">
    <h2>工作经历</h2>
    <ul>
      <li>
        <div class="item-header"><span class="item-title">技术专家 / 架构师</span><span class="item-date">2021-至今</span></div>
        <div class="item-sub">某大型电商平台</div>
        <ul>
          <li>主导交易链路重构，设计基于Saga模式的分布式事务方案，将下单成功率从92%提升至99.5%</li>
          <li>搭建全链路压测平台，模拟双11峰值流量，提前发现并修复系统瓶颈30余处</li>
          <li>推进服务网格（Istio）落地，核心服务P99延迟从800ms降至120ms</li>
          <li>管理20人技术团队，制定技术评审流程，代码合入规范覆盖率达100%</li>
          <li>设计并实现实时数据看板，日均服务500+研发日常查询需求，数据延迟&lt;5s</li>
        </ul>
      </li>
      <li style="margin-top:12px;">
        <div class="item-header"><span class="item-title">高级后端工程师</span><span class="item-date">2018-2021</span></div>
        <div class="item-sub">某金融科技公司</div>
        <ul>
          <li>设计并实现支付网关系统，日均处理支付请求2000万笔，峰值TPS达50000</li>
          <li>引入熔断、限流机制（Redis + Sentinel），系统可用性提升至99.99%</li>
          <li>负责数据库架构优化，分库分表后查询性能提升8倍，主从切换时间&lt;30s</li>
          <li>主导微服务拆分，将单体应用拆分为12个独立服务，发布周期从周级降至天级</li>
        </ul>
      </li>
      <li style="margin-top:12px;">
        <div class="item-header"><span class="item-title">后端工程师</span><span class="item-date">2014-2018</span></div>
        <div class="item-sub">某互联网创业公司</div>
        <ul>
          <li>从0到1搭建订单系统、用户中心、积分体系等核心模块</li>
          <li>实现基于RabbitMQ的异步消息队列，支撑每日百万级消息可靠投递</li>
          <li>优化MySQL慢查询200+，核心接口响应时间降低60%</li>
        </ul>
      </li>
    </ul>
  </div>

  <div class="section">
    <h2>项目经历</h2>
    <ul>
      <li>
        <div class="item-header"><span class="item-title">分布式事务框架（DTM）</span><span class="item-date">2022</span></div>
        <ul>
          <li>开源项目，GitHub 5.2k Stars，支持TCC、Saga、XA三种模式</li>
          <li>支持Go、Java、Python、PHP多语言SDK，月均npm下载量12万次</li>
          <li>已在阿里云、腾讯云市场商业化部署，客户包括多家上市公司</li>
        </ul>
      </li>
      <li style="margin-top:10px;">
        <div class="item-header"><span class="item-title">全链路压测平台</span><span class="item-date">2020</span></div>
        <ul>
          <li>支持流量录制、影子库、流量标记，日均压测场景100+</li>
          <li>压测数据自动清理，节省测试资源成本约40%</li>
        </ul>
      </li>
    </ul>
  </div>

  <div class="section">
    <h2>专业技能</h2>
    <ul class="skills-list">
      <li class="skill-item">Go</li>
      <li class="skill-item">Java</li>
      <li class="skill-item">Python</li>
      <li class="skill-item">分布式系统</li>
      <li class="skill-item">微服务</li>
      <li class="skill-item">Kubernetes</li>
      <li class="skill-item">Istio</li>
      <li class="skill-item">MySQL</li>
      <li class="skill-item">Redis</li>
      <li class="skill-item">Kafka</li>
      <li class="skill-item">Elasticsearch</li>
      <li class="skill-item">ClickHouse</li>
      <li class="skill-item">Prometheus</li>
      <li class="skill-item">Grafana</li>
    </ul>
  </div>

  <div class="section">
    <h2>教育背景</h2>
    <ul>
      <li>
        <div class="item-header"><span class="item-title">计算机科学与技术 硕士</span><span class="item-date">2012-2014</span></div>
        <div class="item-sub">某985重点大学</div>
      </li>
      <li style="margin-top:6px;">
        <div class="item-header"><span class="item-title">计算机科学与技术 学士</span><span class="item-date">2008-2012</span></div>
        <div class="item-sub">某211重点大学</div>
      </li>
    </ul>
  </div>

  <div class="section">
    <h2>证书与荣誉</h2>
    <ul>
      <li>AWS Solutions Architect - Professional, 2023</li>
      <li>CKA（Kubernetes管理员认证）, 2022</li>
      <li>公司年度技术卓越奖, 2021、2022连续两年</li>
      <li>集团Code Review优秀奖, 2020</li>
    </ul>
  </div>

  <div class="section">
    <h2>技术分享</h2>
    <ul>
      <li>QCon、ArchSummit等大会演讲嘉宾，累计分享10+场</li>
      <li>掘金专栏作者，原创文章50+篇，总阅读量100万+</li>
      <li>极客时间《分布式系统实战》课程讲师，学员5000+</li>
      <li>开源贡献者：etcd、RocketMQ、Seata等项目committer</li>
    </ul>
  </div>
</body>
</html>`;
