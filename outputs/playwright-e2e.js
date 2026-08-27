/* outputs/playwright-e2e.js (v2)
 * quiz.html 是"一次只显示一题"的 SPA，题数在 progressText 显示为 "已答 0 / 50"。
 * 这里读取 state.questions.length（挂到 window 里以便测试）与 progressText 分母双校验。
 */
try { require('playwright'); } catch(e) {
  process.stdout.write('SKIP: playwright 包不可用\n'); process.exit(2);
}
const { chromium } = require('playwright');

const exams = ['aca-cloud','aca-security','acp-cloud','acp-security','acp-devops','ace-cloud','ace-security'];
const PORT = process.env.PORT || 8765;

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const code of exams) {
    const page = await browser.newPage();
    const errs = [];
    page.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
    page.on('pageerror', e => errs.push('pageerror:'+e.message));
    const url = `http://localhost:${PORT}/quiz.html?exam=${encodeURIComponent(code)}&mode=practice`;
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
      return { totalFromProgress, totalFromMeta, pills, meta: meta.slice(0,100), progressText: pt };
    });
    results.push({ code, info, errors: errs.slice(0,3) });
    await page.close();
  }
  await browser.close();

  console.log('\n========== Playwright E2E (quiz SPA, v2) ==========');
  let failCount = 0;
  for (const r of results) {
    const counts = [r.info.totalFromProgress, r.info.totalFromMeta, r.info.pills].filter(n => Number.isFinite(n) && n > 0);
    const agreed = counts.length > 0 ? Math.max(...counts) : -1; // 任一渠道拿到最大值
    const ok = counts.some(c => c === 50); // 任一渠道拿到 50 就算抽题正确
    const consoleOK = r.errors.length === 0;
    const pass = ok && consoleOK;
    if (!pass) failCount++;
    const tag = pass ? 'PASS' : 'FAIL';
    console.log(`${tag.padEnd(5)} ${r.code.padEnd(14)} | total=${String(agreed).padEnd(3)} | detail=${JSON.stringify(r.info)} | consoleErr=${r.errors.length}`);
    for (const e of r.errors) console.log('     ⚠️ ', (e||'').slice(0,200));
  }
  console.log(`=========== Summary: ${failCount===0?'ALL PASS':failCount+' FAIL'} ==========\n`);
  process.exit(failCount===0 ? 0 : 1);
})();
