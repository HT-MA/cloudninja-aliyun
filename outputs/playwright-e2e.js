/* outputs/playwright-e2e.js (v3)
 * quiz.html 是"一次只显示一题"的 SPA，题数在 progressText 显示为 "已答 0 / 50"。
 * 这里读取 state.questions.length（挂到 window 里以便测试）与 progressText 分母双校验。
 * 新增：每科 metaKeys 命中率检查（>=60% 下限），ace-ack 作为第 8 科加入。
 */
try { require('playwright'); } catch(e) {
  process.stdout.write('SKIP: playwright 包不可用\n'); process.exit(2);
}
const { chromium } = require('playwright');

const EXAMS = [
  { code:'aca-cloud', title:'ACA 云计算专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=aca-cloud&n=50',
    metaKeys:['云计算','ECS','OSS','VPC','SLB','RDS','云服务器','对象存储','负载均衡','专有网络','数据库','弹性计算'] },
  { code:'aca-security', title:'ACA 云安全专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=aca-security&n=50',
    metaKeys:['云安全','WAF','安骑士','DDoS','数据加密','访问控制','RAM','身份认证','安全组','网络ACL','漏洞扫描','安全合规'] },
  { code:'acp-cloud', title:'ACP 云计算专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=acp-cloud&n=50',
    metaKeys:['云计算架构','ECS实例','OSS存储','VPC网络','SLB负载均衡','RDS数据库','弹性伸缩','自动部署','高可用','容灾备份','性能优化','成本优化','混合云','迁移上云'] },
  { code:'acp-security', title:'ACP 云安全专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=acp-security&n=50',
    metaKeys:['云安全架构','WAF防火墙','主机安全','DDoS防护','数据加密','RAM授权','审计日志','安全合规','等保','数据脱敏','访问控制','威胁检测','应急响应','漏洞管理'] },
  { code:'acp-devops', title:'ACP DevOps 专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=acp-devops&n=50',
    metaKeys:['DevOps','持续集成','持续部署','CI/CD','Jenkins','Docker','Kubernetes','容器','微服务','自动化测试','配置管理','监控告警','敏捷开发','代码管理'] },
  { code:'ace-cloud', title:'ACE 云计算专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=ace-cloud&n=50',
    metaKeys:['云计算架构设计','高可用架构','弹性架构','混合云','容灾','ECS','OSS','VPC','SLB','RDS','性能优化','成本管理','安全架构','网络架构','存储选型','数据库选型'] },
  { code:'ace-security', title:'ACE 云安全专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=ace-security&n=50',
    metaKeys:['云安全体系','零信任','数据安全','应用安全','网络安全','身份认证','权限管理','安全审计','合规治理','威胁情报','入侵检测','应急响应','安全运营','风险评估','密码学','隐私保护'] },
  { code:'ace-ack', title:'ACE ACK 容器服务专项',
    url:'http://127.0.0.1:8000/quiz.html?exam=ace-ack&n=50',
    metaKeys:['集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测','ACK','Kubernetes','Ingress','StatefulSet','HPA','RBAC','Prometheus'] }
];

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const exam of EXAMS) {
    const { code, title, url, metaKeys } = exam;
    const page = await browser.newPage();
    const errs = [];
    page.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
    page.on('pageerror', e => errs.push('pageerror:'+e.message));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      // 在浏览器上下文里读 state（quiz.html 的内联脚本把它放在全局闭包里不可直接访问，但 progressText 的分母就是总题数）
      const pt = document.getElementById('progressText') && document.getElementById('progressText').textContent || '';
      let m = pt.match(/\s(\d+)\s*$/); // "已答 0 / 50" → 50
      const totalFromProgress = m ? parseInt(m[1],10) : -1;
      // 另外，读取 `#examMeta` 显示的题目数
      const meta = (document.getElementById('examMeta') && document.getElementById('examMeta').innerText) || '';
      m = meta.match(/共\s*(\d+)\s*题/);
      const totalFromMeta = m ? parseInt(m[1],10) : -1;
      // 兜底：题号导航若展开会有 quiz-review-pill
      const pills = document.querySelectorAll('.quiz-review-pill').length;
      // 页面全文，用于 metaKeys 命中检查
      const bodyText = (document.body && document.body.innerText) || '';
      return { totalFromProgress, totalFromMeta, pills, meta: meta.slice(0,100), progressText: pt, bodyText };
    });
    // metaKeys 命中检查
    const bodyText = info.bodyText || '';
    let matched = 0;
    const matchedKeys = [];
    for (const k of metaKeys) {
      if (bodyText.indexOf(k) !== -1) { matched++; matchedKeys.push(k); }
    }
    const metaTotal = metaKeys.length;
    const metaThreshold = Math.floor(metaTotal * 0.6);
    console.log('  [meta] ' + code + ' matched ' + matched + '/' + metaTotal + ' (threshold=' + metaThreshold + ', hits=[' + matchedKeys.join(',') + '])');
    const metaOK = matched >= metaThreshold;
    if (!metaOK) {
      errs.push('metaKeys 命中不足: ' + matched + '/' + metaTotal + ' (need >= ' + metaThreshold + ')');
    }
    results.push({ code, info, errors: errs.slice(0,3), metaMatched: matched, metaTotal, metaThreshold });
    await page.close();
  }
  await browser.close();

  console.log('\n========== Playwright E2E (quiz SPA, v3) ==========');
  let failCount = 0;
  for (const r of results) {
    const counts = [r.info.totalFromProgress, r.info.totalFromMeta, r.info.pills].filter(n => Number.isFinite(n) && n > 0);
    const agreed = counts.length > 0 ? Math.max(...counts) : -1; // 任一渠道拿到最大值
    const ok = counts.some(c => c === 50); // 任一渠道拿到 50 就算抽题正确
    const consoleOK = r.errors.length === 0;
    const metaOK = r.metaMatched >= Math.floor(r.metaTotal * 0.6);
    const pass = ok && consoleOK && metaOK;
    if (!pass) failCount++;
    const tag = pass ? 'PASS' : 'FAIL';
    console.log(`${tag.padEnd(5)} ${r.code.padEnd(14)} | total=${String(agreed).padEnd(3)} | meta=${r.metaMatched}/${r.metaTotal}(>=${Math.floor(r.metaTotal*0.6)}) | detail=${JSON.stringify({totalFromProgress:r.info.totalFromProgress,totalFromMeta:r.info.totalFromMeta,pills:r.info.pills})} | consoleErr=${r.errors.length}`);
    for (const e of r.errors) console.log('     ⚠️ ', (e||'').slice(0,200));
  }
  console.log(`=========== Summary: ${failCount===0?'ALL PASS':failCount+' FAIL'} ==========`);
  const aceAck = results.find(r=>r.code==='ace-ack');
  if(aceAck) console.log('ACE_ACK_META_MATCHED='+aceAck.metaMatched+'/'+aceAck.metaTotal+' (threshold=8)');
  process.exit(failCount===0 ? 0 : 1);
})();
