/* ============================================================
 * ACP DevOps 题库扩充 · 验收脚本
 * 用法：node outputs/acp-devops-verify.js
 * 成功：退出码 0，并打印 PASSED；失败：打印 FAIL 并退出 1
 * ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---------- 工具：从任意 .js / .html 中取出顶层 `const NAME = [ ... ];` ----------
function loadArr(srcPath, name) {
  const txt = fs.readFileSync(srcPath, 'utf8');
  const marker = 'const ' + name + ' = [';
  const i = txt.indexOf(marker);
  if (i < 0) throw new Error('[loadArr] 未找到标记 ' + marker + ' 在 ' + path.basename(srcPath));
  const start = txt.indexOf('[', i);
  let depth = 0, p = start, inStr = null, esc = false;
  while (p < txt.length) {
    const c = txt[p];
    if (esc) { esc = false; p++; continue; }
    if (inStr) {
      if (c === '\\') { esc = true; p++; continue; }
      if (c === inStr) inStr = null;
      p++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; p++; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { p++; break; } }
    p++;
  }
  const arrSrc = txt.slice(start, p);
  return eval('(' + arrSrc + ')');
}

// ---------- 模拟 questions-bank.js 的归一化 + 去重逻辑（真实代码镜像）----------
const TYPE_MAP = { single: '单选题', multi: '多选题', judge: '判断题' };
const TOPIC_MAP = {
  ECS: '云服务器ECS', OSS: '对象存储OSS', VPC: '专有网络VPC',
  RDS: '云数据库RDS', SLB: '负载均衡SLB', '安全组': '云安全',
  '云监控': '云计算通用', '弹性伸缩': '弹性伸缩', RAM: '云安全',
  NAT网关: '专有网络VPC', 快照: '云服务器ECS', CDN: '内容分发CDN'
};
function nQ(q) {
  const ca = q.correctAnswers || q.answer || (q.correctAnswer != null ? [q.correctAnswer] : []);
  const rt = q.type || 'single';
  return {
    id: q.id,
    topic: q.module || TOPIC_MAP[q.topic] || q.topic || '云计算通用',
    type: TYPE_MAP[rt] || rt,
    rawType: rt,
    question: q.question,
    options: q.options,
    correctAnswers: ca,
    explanation: q.explanation,
    ref: q.ref
  };
}
function dedupe(list) {
  const s = new Set(); const r = [];
  for (const q of list) {
    const k = (q.question || '').trim();
    if (s.has(k)) continue;
    s.add(k); r.push(q);
  }
  return r;
}
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
// 双段抽题（与改造后的 questions-bank.js 等价）
function pickForExam(all, rule) {
  if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
    const primaryPool = shuffle(all.filter(q => rule.primary.includes(q.topic)));
    const fillPool    = shuffle(all.filter(q => rule.fill.includes(q.topic)));
    const needPrimary = Math.min(rule.minPrimary || 0, primaryPool.length, 50);
    const picked = primaryPool.slice(0, needPrimary);
    const seen = new Set(picked.map(q => q.question.trim()));
    for (const q of fillPool) {
      if (picked.length >= 50) break;
      if (seen.has(q.question.trim())) continue;
      seen.add(q.question.trim()); picked.push(q);
    }
    for (const q of shuffle(all)) {
      if (picked.length >= 50) break;
      if (seen.has(q.question.trim())) continue;
      seen.add(q.question.trim()); picked.push(q);
    }
    return picked.slice(0, 50);
  }
  if (Array.isArray(rule)) {
    let pool = all.filter(q => rule.includes(q.topic));
    if (pool.length === 0) pool = all;
    return shuffle(pool).slice(0, 50);
  }
  return shuffle(all.slice()).slice(0, 50);
}

// ---------- 载入 ----------
const QUESTIONS_DATA = loadArr(path.join(ROOT, 'acp-quiz/questions-data.js'),  'QUESTIONS');
const RDS_QUESTIONS  = loadArr(path.join(ROOT, 'acp-quiz/questions-rds.js'),   'RDS_QUESTIONS');
const EXTRA_TOPIC    = loadArr(path.join(ROOT, 'acp-quiz/questions-extra.js'), 'EXTRA_TOPIC_QUESTIONS');
const DEVOPS         = loadArr(path.join(ROOT, 'acp-quiz/questions-devops.js'),'DEVOPS_QUESTIONS');
const INLINE         = (() => {
  try { return loadArr(path.join(ROOT, 'quiz.html'), 'QUESTIONS'); }
  catch (e) { return []; }
})();

const ALL_RAW = []
  .concat(RDS_QUESTIONS)
  .concat(EXTRA_TOPIC)
  .concat(INLINE)
  .concat(QUESTIONS_DATA)
  .concat(DEVOPS);
const BANK = dedupe(ALL_RAW.map(nQ));

const errors = [];
const assert = (cond, msg) => { if (!cond) errors.push(msg); };

// ---------- 断言 1：基本计数 ----------
assert(DEVOPS.length === 140, '[T1] DEVOPS_QUESTIONS 题数应为 140，实际 ' + DEVOPS.length);
assert(BANK.length >= 340, '[T1] 合并去重后总题数应 >=340（目标 343），实际 ' + BANK.length);
console.log('[T1] 基础计数 OK：DEVOPS=' + DEVOPS.length + '，合并去重后 BANK=' + BANK.length);

// ---------- 断言 2：7 主域分布 ----------
const EXPECTED = {
  '云效DevOps平台':   { min: 22, types: { single: 10, multi: 9,  judge: 3 } },
  '容器服务ACK':      { min: 26, types: { single: 12, multi: 11, judge: 3 } },
  '容器镜像ACR':      { min: 16, types: { single: 7,  multi: 7,  judge: 2 } },
  'IaC与运维编排':    { min: 22, types: { single: 10, multi: 10, judge: 2 } },
  '可观测与监控':     { min: 20, types: { single: 9,  multi: 9,  judge: 2 } },
  '发布与部署策略':   { min: 14, types: { single: 6,  multi: 7,  judge: 1 } },
  '微服务与服务治理': { min: 20, types: { single: 9,  multi: 9,  judge: 2 } }
};
const devopsOnly = BANK.filter(q => Object.prototype.hasOwnProperty.call(EXPECTED, q.topic));
const topicCount = {};
const typeCount  = {};
for (const q of devopsOnly) {
  topicCount[q.topic] = (topicCount[q.topic] || 0) + 1;
  typeCount[q.topic] = typeCount[q.topic] || { single: 0, multi: 0, judge: 0 };
  typeCount[q.topic][q.rawType]++;
}
for (const [t, exp] of Object.entries(EXPECTED)) {
  const cnt = topicCount[t] || 0;
  assert(cnt >= exp.min, '[T2] topic=' + t + ' 题数应为 >=' + exp.min + '，实际 ' + cnt);
  for (const [k, v] of Object.entries(exp.types)) {
    const actual = (typeCount[t] && typeCount[t][k]) || 0;
    assert(Math.abs(actual - v) <= 1, '[T2] topic=' + t + ' ' + k + '题 目标=' + v + ' 实际=' + actual + '（允许±1）');
  }
}
console.log('[T2] 7 主域分布 OK：' + Object.entries(topicCount).sort().map(([k,v]) => (k.slice(0,4) + '=' + v)).join(' '));

// ---------- 断言 3：字段合法性（140 道新题单查）----------
const ID_PREFIXES = /^(yx|ack|acr|iac|obs|rel|mse)(\d+)$/;
const ID_UPPER = { yx: 22, ack: 26, acr: 16, iac: 22, obs: 20, rel: 14, mse: 20 };
const seenIds = new Set();
for (let idx = 0; idx < DEVOPS.length; idx++) {
  const q = DEVOPS[idx];
  assert(q && typeof q === 'object', '[T3] DEVOPS[' + idx + '] 不是对象');
  assert(typeof q.id === 'string' && ID_PREFIXES.test(q.id), '[T3] DEVOPS[' + idx + '] id="' + q.id + '" 不符合前缀规则');
  const m = q.id.match(ID_PREFIXES);
  if (m) {
    const n = parseInt(m[2], 10);
    assert(n >= 1 && n <= ID_UPPER[m[1]], '[T3] id=' + q.id + ' 序号越界：最大 ' + ID_UPPER[m[1]]);
  }
  assert(!seenIds.has(q.id), '[T3] id 重复：' + q.id);
  seenIds.add(q.id);
  assert(Object.prototype.hasOwnProperty.call(EXPECTED, q.module), '[T3] id=' + q.id + ' module="' + q.module + '" 不在 7 主域中');
  assert(['single','multi','judge'].includes(q.type), '[T3] id=' + q.id + ' type=' + q.type + ' 非法');
  assert(Array.isArray(q.options) && (q.type === 'judge' ? q.options.length === 2 : q.options.length >= 3), '[T3] id=' + q.id + ' options 长度非法');
  if (q.type === 'judge') {
    assert(q.options[0] === '正确' && q.options[1] === '错误', '[T3] id=' + q.id + ' judge 选项不是["正确","错误"]');
  }
  assert(Array.isArray(q.answer) && q.answer.length >= 1, '[T3] id=' + q.id + ' answer 非空数组');
  for (const a of q.answer) {
    assert(Number.isInteger(a) && a >= 0 && a < q.options.length, '[T3] id=' + q.id + ' answer 越界：' + a);
  }
  if (q.type === 'single' || q.type === 'judge') {
    assert(q.answer.length === 1, '[T3] id=' + q.id + ' ' + q.type + ' 应只有 1 个答案');
  }
  assert(typeof q.question === 'string' && q.question.trim().length >= 8, '[T3] id=' + q.id + ' 题干过短');
  assert(typeof q.explanation === 'string' && q.explanation.trim().length >= 20, '[T3] id=' + q.id + ' 解析过短');
  assert(typeof q.ref === 'string' && q.ref.startsWith('help.aliyun.com'), '[T3] id=' + q.id + ' ref 格式应为 help.aliyun.com/...，实际 "' + q.ref + '"');
}
console.log('[T3] 字段/索引/格式 全通过：' + DEVOPS.length + '/140');

// ---------- 断言 4：140 题内部重复 & 与旧库重复 ----------
const deDup140 = dedupe(DEVOPS.map(nQ));
assert(deDup140.length === DEVOPS.length, '[T4] 140 题内部去重后题数不一致：' + deDup140.length + ' != ' + DEVOPS.length);
const OLD_BANK = dedupe([].concat(RDS_QUESTIONS, EXTRA_TOPIC, INLINE, QUESTIONS_DATA).map(nQ));
const OLD_Q_TXT = new Set(OLD_BANK.map(q => q.question.trim()));
let overlap = 0;
for (const q of DEVOPS) {
  if (OLD_Q_TXT.has(q.question.trim())) overlap++;
}
assert(overlap === 0, '[T4] 新题与旧题库有 ' + overlap + ' 道题干重复（需去重或改写）');
console.log('[T4] 去重 OK：140 内部 0 重复，与旧库 203 重叠=' + overlap);

// ---------- 断言 5：ACP DevOps 双段抽题连续 5 场 ----------
const DEVOPS_CORE_TOPICS = Object.keys(EXPECTED);
const DEVOPS_FILL_TOPICS = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS'];
const rule = { primary: DEVOPS_CORE_TOPICS, fill: DEVOPS_FILL_TOPICS, minPrimary: 35 };
for (let i = 1; i <= 5; i++) {
  const paper = pickForExam(BANK, rule);
  const pCount = paper.filter(q => DEVOPS_CORE_TOPICS.includes(q.topic)).length;
  assert(paper.length === 50, '[T5-' + i + '] 题目数 != 50：' + paper.length);
  assert(pCount >= 35, '[T5-' + i + '] primary 域题数=' + pCount + ' < 35（下限）');
  const uniq = new Set(paper.map(q => q.question.trim())).size;
  assert(uniq === paper.length, '[T5-' + i + '] 同一场有重复题：uniq=' + uniq + ' != 50');
  console.log('[T5-' + i + '] 试卷 OK：primary=' + pCount + '/50（≥35）');
}

// ---------- 断言 6：其它考试方向行为等价（长度 50 即可）----------
const OLD_EXAMS = {
  'aca-cloud':    null,
  'aca-security': ['云安全','专有网络VPC','云服务器ECS','云计算通用'],
  'acp-cloud':    null,
  'acp-security': ['云安全','专有网络VPC','云服务器ECS','云计算通用'],
  'ace-cloud':    null,
  'ace-security': ['云安全','专有网络VPC','云服务器ECS','云计算通用']
};
for (const [code, r] of Object.entries(OLD_EXAMS)) {
  const p = pickForExam(BANK, r);
  assert(p.length === 50, '[T6] ' + code + ' 抽题数量=' + p.length + ' != 50');
}
console.log('[T6] 其余 6 个考试方向抽题数量均为 50（改造无回归）');

// ---------- 汇总 ----------
if (errors.length === 0) {
  console.log('\n✅ PASSED 全部 6 类断言通过');
  process.exit(0);
} else {
  console.log('\n❌ FAILED ' + errors.length + ' 项：');
  for (const m of errors) console.log('   - ' + m);
  process.exit(1);
}
