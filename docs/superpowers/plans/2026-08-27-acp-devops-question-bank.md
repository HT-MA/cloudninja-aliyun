# ACP DevOps 题库扩充 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 140 道阿里云 DevOps 专属题（7 主域）并改造 acp-devops 模拟考试为"双段优先"抽题，使每场 50 题中 DevOps 专属题 ≥ 35（≥70% 纯度），同步更新题库引入链与 README，总题数从 203 增至 343，全流程自测一遍无报错。

**Architecture:** 纯前端零构建；仅新增 1 个独立题库 JS 文件，在 quiz.html `<script>` 链末尾（questions-bank.js 之前）引入；questions-bank.js 扩展 `EXTRA_QUESTIONS` 合并 + `EXAM_MODULES['acp-devops']` 由数组改为对象（`{primary, fill, minPrimary}`）+ `getQuestionsForExam()` 兼容"对象 / 数组 / null"三种 rule。所有新题严格复用 questions-rds.js 的字段契约（`id/module/type/question/options/answer/explanation/ref`）。

**Tech Stack:** HTML / CSS / 原生 JavaScript（无框架、无 npm）、Node.js v24+（仅用于本地验收脚本）。

---

## 📋 文件改动总览

| # | 操作 | 路径 | 说明 |
|---|---|---|---|
| 1 | 新建 | `acp-quiz/questions-devops.js` | 140 题，7 主域，常量名 `DEVOPS_QUESTIONS` |
| 2 | 修改 | `quiz.html:105-108` | 在 questions-extra.js 后、questions-bank.js 前插入 `<script src="acp-quiz/questions-devops.js">` |
| 3 | 修改 | `questions-bank.js:46-63,73-83` | (a) 合并 DEVOPS_QUESTIONS (b) 新增 DevOps 双段常量 (c) `acp-devops` rule 改对象 (d) `getQuestionsForExam` 支持对象 rule |
| 4 | 修改 | `README.md:12,47-51,67-82` | 题库数量 203 → 343；项目结构 + 说明表 + 快速开始 URL 表补 ACP DevOps 行 |
| 5 | （可选）修改 | `certifications.html:706-714` | `acp-devops.topics` 补两行子域描述（ACK/容器 / MSE/微服务），纯文字对齐 |
| 6 | 新建（验收用） | `outputs/acp-devops-verify.js` | Node 验收脚本：解析题数 / 去重 / 索引 / topic 分布 / acp-devops 双段抽题 5 场 ≥35 主域题 |

---

## Task 0：创建验收脚本（先行，TDD 思路先写"断言"）

**Files:**
- Create: `outputs/acp-devops-verify.js`
- Read reference: `acp-quiz/questions-rds.js`（字段契约参考）

- [ ] **Step 1: 编写 `outputs/acp-devops-verify.js`（完整内容如下）**

```js
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
  if (i < 0) throw new Error(`[loadArr] 未找到标记 ${marker} 在 ${path.basename(srcPath)}`);
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
  // eslint-disable-next-line no-eval
  return eval('(' + arrSrc + ')');
}

// ---------- 模拟 questions-bank.js 的归一化 + 去重逻辑（真实代码镜像）----------
const TYPE_MAP = { single: '单选题', multi: '多选题', judge: '判断题' };
const TOPIC_MAP = {
  ECS: '云服务器ECS', OSS: '对象存储OSS', VPC: '专有网络VPC',
  RDS: '云数据库RDS', SLB: '负载均衡SLB', 安全组: '云安全',
  云监控: '云计算通用', 弹性伸缩: '弹性伸缩', RAM: '云安全',
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
  catch (e) { return []; } // quiz.html 内联若不叫 QUESTIONS 也不影响本次验收
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
assert(DEVOPS.length === 140, `[T1] DEVOPS_QUESTIONS 题数应为 140，实际 ${DEVOPS.length}`);
assert(BANK.length >= 340, `[T1] 合并去重后总题数应 ≥340（目标 343），实际 ${BANK.length}`);
console.log(`[T1] 基础计数 OK：DEVOPS=${DEVOPS.length}，合并去重后 BANK=${BANK.length}`);

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
  assert(cnt >= exp.min, `[T2] topic=${t} 题数应为 ≥${exp.min}，实际 ${cnt}`);
  for (const [k, v] of Object.entries(exp.types)) {
    const actual = (typeCount[t] && typeCount[t][k]) || 0;
    assert(Math.abs(actual - v) <= 1, `[T2] topic=${t} ${k}题 目标=${v} 实际=${actual}（允许±1）`);
  }
}
console.log('[T2] 7 主域分布 OK：', Object.entries(topicCount).sort().map(([k,v]) => `${k.split('').slice(0,4).join('')}=${v}`).join(' '));

// ---------- 断言 3：字段合法性（140 道新题单查）----------
const ID_PREFIXES = /^(yx|ack|acr|iac|obs|rel|mse)(\d+)$/;
const ID_UPPER = { yx: 22, ack: 26, acr: 16, iac: 22, obs: 20, rel: 14, mse: 20 };
const seenIds = new Set();
for (let idx = 0; idx < DEVOPS.length; idx++) {
  const q = DEVOPS[idx];
  assert(q && typeof q === 'object', `[T3] DEVOPS[${idx}] 不是对象`);
  assert(typeof q.id === 'string' && ID_PREFIXES.test(q.id), `[T3] DEVOPS[${idx}] id="${q.id}" 不符合前缀规则`);
  const m = q.id.match(ID_PREFIXES);
  if (m) {
    const n = parseInt(m[2], 10);
    assert(n >= 1 && n <= ID_UPPER[m[1]],
      `[T3] id=${q.id} 序号越界：最大 ${ID_UPPER[m[1]]}`);
  }
  assert(!seenIds.has(q.id), `[T3] id 重复：${q.id}`);
  seenIds.add(q.id);
  assert(Object.prototype.hasOwnProperty.call(EXPECTED, q.module),
    `[T3] id=${q.id} module="${q.module}" 不在 7 主域中`);
  assert(['single','multi','judge'].includes(q.type),
    `[T3] id=${q.id} type=${q.type} 非法`);
  assert(Array.isArray(q.options) &&
    (q.type === 'judge' ? q.options.length === 2 : q.options.length >= 3),
    `[T3] id=${q.id} options 长度非法`);
  if (q.type === 'judge') {
    assert(q.options[0] === '正确' && q.options[1] === '错误',
      `[T3] id=${q.id} judge 选项不是["正确","错误"]`);
  }
  assert(Array.isArray(q.answer) && q.answer.length >= 1,
    `[T3] id=${q.id} answer 非空数组`);
  for (const a of q.answer) {
    assert(Number.isInteger(a) && a >= 0 && a < q.options.length,
      `[T3] id=${q.id} answer 越界：${a}`);
  }
  if (q.type === 'single' || q.type === 'judge') {
    assert(q.answer.length === 1, `[T3] id=${q.id} ${q.type} 应只有 1 个答案`);
  }
  assert(typeof q.question === 'string' && q.question.trim().length >= 8,
    `[T3] id=${q.id} 题干过短`);
  assert(typeof q.explanation === 'string' && q.explanation.trim().length >= 20,
    `[T3] id=${q.id} 解析过短`);
  assert(typeof q.ref === 'string' && q.ref.startsWith('help.aliyun.com'),
    `[T3] id=${q.id} ref 格式应为 help.aliyun.com/...，实际 "${q.ref}"`);
}
console.log(`[T3] 字段/索引/格式 全通过：140/140`);

// ---------- 断言 4：140 题内部重复 & 与旧库重复 ----------
const deDup140 = dedupe(DEVOPS.map(nQ));
assert(deDup140.length === DEVOPS.length,
  `[T4] 140 题内部去重后题数不一致：${deDup140.length} != ${DEVOPS.length}`);
// 与 DEVOPS 以外的 203 道库比较
const OLD_BANK = dedupe([].concat(RDS_QUESTIONS, EXTRA_TOPIC, INLINE, QUESTIONS_DATA).map(nQ));
const OLD_Q_TXT = new Set(OLD_BANK.map(q => q.question.trim()));
let overlap = 0;
for (const q of DEVOPS) {
  if (OLD_Q_TXT.has(q.question.trim())) overlap++;
}
assert(overlap === 0, `[T4] 新题与旧题库有 ${overlap} 道题干重复（需去重或改写）`);
console.log(`[T4] 去重 OK：140 内部 0 重复，与旧库 203 重叠=${overlap}`);

// ---------- 断言 5：ACP DevOps 双段抽题连续 5 场 ----------
const DEVOPS_CORE_TOPICS = Object.keys(EXPECTED);
const DEVOPS_FILL_TOPICS = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS'];
const rule = { primary: DEVOPS_CORE_TOPICS, fill: DEVOPS_FILL_TOPICS, minPrimary: 35 };
for (let i = 1; i <= 5; i++) {
  const paper = pickForExam(BANK, rule);
  const pCount = paper.filter(q => DEVOPS_CORE_TOPICS.includes(q.topic)).length;
  assert(paper.length === 50, `[T5-${i}] 题目数 != 50：${paper.length}`);
  assert(pCount >= 35, `[T5-${i}] primary 域题数=${pCount} < 35（下限）`);
  // 同一场不得重复
  const uniq = new Set(paper.map(q => q.question.trim())).size;
  assert(uniq === paper.length, `[T5-${i}] 同一场有重复题：uniq=${uniq} != 50`);
  console.log(`[T5-${i}] 试卷 OK：primary=${pCount}/50（≥35）`);
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
  assert(p.length === 50, `[T6] ${code} 抽题数量=${p.length} != 50`);
}
console.log('[T6] 其余 6 个考试方向抽题数量均为 50（改造无回归）');

// ---------- 汇总 ----------
if (errors.length === 0) {
  console.log('\n✅ PASSED 全部 6 类断言通过');
  process.exit(0);
} else {
  console.log(`\n❌ FAILED ${errors.length} 项：`);
  for (const m of errors) console.log('   -', m);
  process.exit(1);
}
```

- [ ] **Step 2: 运行脚本确认它 FAIL（因为 DEVOPS_QUESTIONS 还不存在）**

Run（PowerShell）：
```powershell
node outputs/acp-devops-verify.js
```
Expected：FAIL，首条错误类似 `[loadArr] 未找到标记 const DEVOPS_QUESTIONS = [ 在 questions-devops.js`

---

## Task 1：建立 questions-devops.js 文件骨架 + 样例 7 题

**Files:**
- Create: `acp-quiz/questions-devops.js`（140 题完整列表，本 task 先写文件头 + 样例 7 题 + 空数组位，Task2~8 逐域填充）

- [ ] **Step 1: 写入文件头 + 常量空壳 + Spec §6 内 7 道锚点样例（保证立即通过字段断言）**

内容（`acp-quiz/questions-devops.js`，本步写"文件头 + 7 题"即可，后续任务再 `concat`/追加）：

```js
// 云忍者 — 2026 ACP DevOps 大纲补充题库（7 大域共 140 题）
// 覆盖：云效DevOps平台、容器服务ACK、容器镜像ACR、
//       IaC与运维编排（ROS/Terraform/OOS）、可观测与监控（SLS/ARMS/Prometheus）、
//       发布与部署策略（滚动/蓝绿/灰度/流水线质量门禁）、微服务与服务治理（MSE/ASM）
// 格式与 questions-rds.js 完全一致：
//   {id, module, type:'single|multi|judge', question, options, answer:[idx...], explanation, ref}
//   id 前缀：yx/ack/acr/iac/obs/rel/mse，对应 7 主域；ref 统一为 help.aliyun.com/...（无 https:// 前缀）
//   judge 固定 options:["正确","错误"]；multi 答案为索引数组

const DEVOPS_QUESTIONS = [
  // ========== 1. 云效DevOps平台 yx01~22（10 单 + 9 多 + 3 判） ==========
  {id:'yx03',module:'云效DevOps平台',type:'multi',question:'关于阿里云云效 Codeup 的代码库保护规则，以下哪些是官方默认支持且推荐用于主干保护的能力？',options:['Push 限制（仅允许特定成员或通过合并请求合入）','合并请求（MR）必须至少通过 N 个评审人审批','合并前必须通过 CI 流水线构建与代码质量门禁','合并前必须在本地执行一次代码格式化提交'],answer:[0,1,2],explanation:'Codeup 主干保护支持 Push 限制、MR 审批人数量门槛、CI 检查门禁（必须通过流水线任务才能合并）三大基础能力，A/B/C 正确。D 所述"本地必须执行格式化再提交"是团队约定，Codeup 可以通过流水线阶段强制检查格式化产物，但并非平台内建的"保护规则"开关。',ref:'help.aliyun.com/zh/codeup/user-guide/protect-a-branch/'},

  // ========== 2. 容器服务ACK ack01~26（12 单 + 11 多 + 3 判） ==========
  {id:'ack05',module:'容器服务ACK',type:'single',question:'阿里云 ACK 集群中，以下哪种网络插件支持 Pod 直接使用弹性网卡 ENI、Pod IP 与 VPC 处于同一扁平网络平面、可被 VPC 内其他服务直接三层路由？',options:['Flannel','Terway（ENI 多 IP 模式）','Calico BGP','Kube-router'],answer:[1],explanation:'Terway 是阿里云自研 CNI，在 ENI 多 IP / ENI 直通模式下 Pod 直接挂载弹性网卡辅助 IP，Pod IP 属于 VPC CIDR，可被 VPC 三层路由。Flannel 走 VxLAN Overlay，Pod IP 为虚拟 CIDR，默认不能被 VPC 对等三层互通。C/D 不是阿里云 ACK 默认官方提供的网络插件。',ref:'help.aliyun.com/zh/ack/product-overview/terway-overview'},

  // ========== 3. 容器镜像ACR acr01~16（7 单 + 7 多 + 2 判） ==========
  {id:'acr06',module:'容器镜像ACR',type:'judge',question:'阿里云容器镜像服务 ACR 企业版（EE）支持跨地域实例间的镜像自动同步，并且可以配置触发规则（例如每次向主实例推送指定仓库镜像后自动同步到灾备实例）。',options:['正确','错误'],answer:[0],explanation:'ACR 企业版提供"同步实例"功能，支持在命名空间级别配置源/目标实例对，并可与仓库 Trigger 联动；支持跨地域、跨账号、跨实例同步，可用于异地灾备与就近拉取场景。',ref:'help.aliyun.com/zh/acr/user-guide/synchronize-images-between-instances/'},

  // ========== 4. IaC与运维编排 iac01~22（10 单 + 10 多 + 2 判） ==========
  {id:'iac11',module:'IaC与运维编排',type:'multi',question:'关于阿里云 ROS（资源编排服务）与 Terraform（阿里云 Provider）的使用对比，以下说法正确的有？',options:['ROS 模板原生支持 JSON / YAML，Terraform 采用 HCL 语言','两者都支持"变更预演"（ROS 变更集 Change Set / Terraform Plan）再执行','Terraform 的 State 必须存储在本地磁盘，ROS 不需要维护 State','两者都支持通过嵌套栈 / Module 对模板进行模块化复用'],answer:[0,1,3],explanation:'A 正确，模板格式如上；B 正确，ROS 变更集与 terraform plan 都是先展示要 Create/Update/Delete 的资源再落盘执行；C 错误：Terraform State 官方推荐远程 backend（阿里云 OSS / Terraform Cloud / Consul 等），避免本地锁冲突与丢失；D 正确，ROS 嵌套栈 + Terraform Module 都是常用的复用手段。',ref:'help.aliyun.com/zh/ros/'},

  // ========== 5. 可观测与监控 obs01~20（9 单 + 9 多 + 2 判） ==========
  {id:'obs07',module:'可观测与监控',type:'single',question:'阿里云 SLS 日志服务中，要对一个 Logstore 的日志做全文关键词检索 + SQL 字段聚合分析，必须先在控制台开启以下哪项配置？',options:['日志分区（Shard）自动分裂','索引（全文索引 + 字段索引）','开通日志投递到 OSS','开启消费组（Consumer Group）'],answer:[1],explanation:'SLS 的查询分析功能完全依赖索引：全文索引决定哪些关键词可以被检索，字段索引（标注字段类型 long/double/text/json）决定 SQL 能否按列 SELECT/GROUP BY/AGG。Shard 自动分裂是吞吐扩展、投递 OSS 是离线归档、消费组是实时流式消费，三者都不影响"查询/SQL"能力。',ref:'help.aliyun.com/zh/sls/user-guide/configure-index'},

  // ========== 6. 发布与部署策略 rel01~14（6 单 + 7 多 + 1 判） ==========
  {id:'rel08',module:'发布与部署策略',type:'multi',question:'关于"灰度发布（金丝雀）"和"蓝绿发布"的对比，下列说法正确的是？',options:['蓝绿发布需要同时维护两套容量对等的环境，切换时流量整体 0%→100% 切到新环境','灰度发布是按比例逐步放量（如 5%→20%→50%→100%），可在中间阶段观察监控指标后再决定继续或回滚','灰度发布和蓝绿发布都可以做到"零停机发布"','两种策略都必须依赖 Service Mesh（如 ASM/Istio）才能实现'],answer:[0,1,2],explanation:'A/B 是两策略的教科书级区别，均正确；C 正确，因为蓝绿切换是原子切换，灰度过程中新版本并行运行，两种用户侧都无停机；D 错误：蓝绿可以只靠 SLB 权重 / DNS 切流量实现，灰度可以靠 ACK 原生 Deployment 的 canary 控制器或 Nginx Ingress 注解切权重实现，Service Mesh 提供的是更细粒度的 Header/Cookie/用户维度路由，不是必要条件。',ref:'help.aliyun.com/zh/ack/best-practices/use-ingresses-to-implement-gray-release'},

  // ========== 7. 微服务与服务治理 mse01~20（9 单 + 9 多 + 2 判） ==========
  {id:'mse04',module:'微服务与服务治理',type:'single',question:'阿里云微服务引擎 MSE 中，以下哪一组件提供了开箱即用的 Nacos 注册中心 + 配置中心托管能力，支持命名空间隔离、配置加密、配置版本回溯、配置灰度推送？',options:['MSE 云原生网关','MSE 注册配置中心（Nacos 托管版）','MSE 服务治理（标签路由、全链路灰度、流量防护）','MSE ZooKeeper 独享版'],answer:[1],explanation:'MSE 注册配置中心提供 Nacos（同时支持 Eureka/ZooKeeper 协议兼容）托管版实例，直接对应题干能力。A 是南北向七层网关；C 是叠加在应用接入之上的治理能力（与注册中心解耦）；D 只有 ZooKeeper，不含 Nacos。',ref:'help.aliyun.com/zh/mse/product-overview/what-is-mse'}

  // ===== 其余 133 题将在 Task 2~Task 8 按域追加（保持同一行内 {id,module,type,...} 单对象格式，不要多行缩进以免超过约定宽度） =====
];
```

- [ ] **Step 2: 运行验收脚本，T1 应报"DEVOPS=7，期望 140"，T3 断言 7 题全通过**

Run：
```powershell
node outputs/acp-devops-verify.js
```
Expected：FAIL，仅 7 题；但 7 道样例题不再触发 T3 字段断言。

- [ ] **Step 3: 提交（若使用 git）**
```bash
git add acp-quiz/questions-devops.js outputs/acp-devops-verify.js
git commit -m "test(verify): add acp-devops acceptance script + 7 anchor questions"
```

---

## Task 2：填充"云效DevOps平台"剩余 21 题（yx 系列达 22 题）

**Files:**
- Modify: `acp-quiz/questions-devops.js`（在 `// 1. 云效DevOps平台...` 区块追加，使 `yx01~22` 齐全、题型：10 单 / 9 多 / 3 判）

子主题强制覆盖清单：
- Codeup：分支模型（GitFlow/Trunk）、MR 评审、保护规则（Push 限制/审批/CI 门禁）、代码扫描（敏感信息/许可证/代码质量）、大文件存储 LFS
- Flow 流水线：阶段 / 任务 / Job 并行、缓存（.m2 / node_modules）、自定义构建镜像、CI 变量（普通/加密）、手动审批节点、触发器（代码 push / Tag / MR）、Java Maven / Node npm 构建样例
- Packages 制品库：制品类型（Maven/NPM/PyPI/Generic）、版本不可变、权限（项目级/仓库级）、制品扫描（漏洞/许可证/恶意文件）、与 Flow 构建上传对接
- 效能洞察（DORA）：四个指标（交付吞吐率、交付时长、变更失败率、服务恢复时间 MTTR）、吞吐率 vs 稳定性权衡

- [ ] **Step 1: 追加 21 题使 yx01~22 齐全（含已有的 yx03）。建议：先一次性补齐 yx 区块，保证序号 01~22 不重不漏，题型按 spec（10 单 / 9 多 / 3 判）。**

> ⚠️ 所有题目都写为一行对象（与 questions-rds.js 风格一致），每个选项中文长度 ≤ 60 汉字，解释中对多选题的 4 个选项逐项说 A/B/C/D 对错；`ref` 字段使用 `help.aliyun.com/zh/codeup/...`、`help.aliyun.com/zh/yunxiao/user-guide/...`、`help.aliyun.com/zh/devops/...`、`help.aliyun.com/zh/packages/...` 等真实路径，不要写通配符。为避免 plan 过度膨胀，具体 21 题题目文本由实施工程师按照 spec §2.1 数据结构 + Spec §6 样例风格撰写即可（本 step 仅约束写作规则，不展开全文 21×）。

- [ ] **Step 2: 跑验收脚本，断言 T2 中"云效DevOps平台" ≥22 且题型 (10/9/3 ±1)**

Run：
```powershell
node outputs/acp-devops-verify.js
```
Expected：T1 仍未通过（总数 7+21=28）；T2 云效一项通过。

---

## Task 3：填充"容器服务ACK"26 题（ack01~26）

**Files:**
- Modify: `acp-quiz/questions-devops.js`（在对应 `// 2. 容器服务ACK...` 注释块内补齐 ack01~26，总计 26 题：12 单 / 11 多 / 3 判）

必须覆盖的子知识点：
- 集群类型：专有版 Dedicated / 托管版 Managed / 无服务器版 ASK / 边缘集群；各集群的控制面节点管理与费用差异
- 节点 & 节点池：节点池自动伸缩（Cluster Autoscaler / CA）、节点污点 Taint 与 Pod 容忍 Tolerations、自定义节点镜像、节点维护排水 cordon/drain
- 工作负载：Deployment（滚动/策略）、StatefulSet（稳定网络标识+稳定卷）、DaemonSet（每个节点一 Pod）、Job / CronJob
- 服务网络：ClusterIP / NodePort / LoadBalancer；Ingress 控制器（Nginx Ingress / MSE Ingress）；CLB vs NLB 选择与注解
- 存储：StorageClass + PV/PVC；CSI 插件（云盘 CSI / NAS CSI / OSS CSI）；常见挂载参数
- CNI：Flannel（Overlay，易用）vs Terway ENI 多 IP（扁平 VPC 网络）vs Terway ENI-Trunking（高密 Pod）；Pod 安全组
- Helm：Chart 结构（templates/values.yaml/Chart.yaml）、Install/Upgrade/Rollback/Uninstall、Release 概念、第三方 Repo 引入
- 配额与多租户：命名空间、ResourceQuota（CPU/Mem/PVC 数）、LimitRange（默认请求/限制）、RBAC（ServiceAccount / Role / RoleBinding）
- 常见故障：ImagePullBackOff（镜像拉取失败→仓库/网络/Secret）、CrashLoopBackOff（应用启动失败→看日志、Events、liveness/readiness Probe）、Pending（资源不足/StorageClass 缺失/污点不匹配）

- [ ] **Step 1: 补齐 ack01~26（含已有 ack05）共 26 题，题型 (12/11/3 ±1)**
- [ ] **Step 2: 验收脚本 T2 容器服务ACK ≥26、题型误差 ≤1**

```powershell
node outputs/acp-devops-verify.js
```

---

## Task 4：填充"容器镜像ACR"16 题（acr01~16）

**Files:**
- Modify: `acp-quiz/questions-devops.js`（对应注释块补齐 acr01~16：7 单 / 7 多 / 2 判）

子主题清单：
- 实例对比：默认实例（免费）、基础版、企业版 EE（多可用区容灾、跨地域同步、P2P、加速、企业级 SLA）、Helm Chart 托管版
- 命名空间 / 仓库：Repository 命名、公开/私有、Tag 不可变（防止被覆盖）、保留策略（按数量/时间清理旧 Tag）
- 安全扫描：3 类（系统漏洞 CVE、恶意文件、许可证合规风险）、自动扫描触发、扫描结果阻断部署（与 Flow 流水线门禁配合）
- 同步：跨地域（同一账号同主实例的不同地域）、跨实例（EE 实例对 EE 实例）、跨账号（通过 RAM 授权）、触发规则（Tag push→自动同步）
- Trigger：ACK 触发器（推镜像后自动滚动更新 ACK Deployment）；与 Jenkins/云效 Flow 的 Webhook 协作
- 其它：ACR P2P 分发（大规模集群镜像加速）、Helm Chart 仓库、OCI Artifacts（除镜像外还能托管 SBOM / 证明 / Helm 包）

- [ ] **Step 1: 补齐 acr01~16（含 acr06）共 16 题**
- [ ] **Step 2: 验收脚本 T2 容器镜像ACR ≥16**

---

## Task 5：填充"IaC与运维编排"22 题（iac01~22）

**Files:**
- Modify: `acp-quiz/questions-devops.js`（iac 区块补齐 22：10 单 / 10 多 / 2 判，含 iac11）

子主题清单：
- ROS：模板（Resources、Outputs、Parameters、Mappings、Conditions、Fn::GetAtt/Ref）、栈生命周期（创建/更新/删除）、变更集 Change Set（预览 diff 后才应用）、嵌套栈 Nested Stack（按模块拆模板）、漂移检测 Drift Detection（资源被手改后提示漂移）、删除保护 Deletion Protection、回滚策略（回滚到上一成功版本 vs 不回滚）、自定义资源（触发器 + Function Compute）
- Terraform：HCL 基本块（resource / data / variable / output / locals）、Provider（`aliyun` 版本约束）、State（远程 backend 到 OSS，锁 & 协作）、Module（复用 / Registry）、Workspace（dev/staging/prod 分离）、`plan / apply / destroy`、`lifecycle`（create_before_destroy / prevent_destroy / ignore_changes）
- OOS 运维编排：模板（公共模板 vs 自定义模板 JSON/YAML）、任务类型：运行命令 / API 调用 / 审批节点 / 等待 / 分支、批量运维（标签选择一堆 ECS 批量执行命令）、定时运维（Cron）、跨地域执行、速率控制与错误阈值、与云监控告警联动触发

- [ ] **Step 1: 补齐 iac01~22（含 iac11）共 22 题**
- [ ] **Step 2: 验收脚本 T2 IaC与运维编排 ≥22，题型误差 ≤1**

---

## Task 6：填充"可观测与监控"20 题（obs01~20）

**Files:**
- Modify: `acp-quiz/questions-devops.js`（obs 区块补齐 20：9 单 / 9 多 / 2 判，含 obs07）

子主题清单：
- SLS 日志服务：Project / Logstore / Shard（可合并分裂）、机器组 + Logtail 采集配置、索引（全文+字段、字段类型 long/double/text/json）、查询语法（关键词、字段名:值、布尔 AND/OR/NOT、时间范围）、SQL `* | SELECT ... GROUP BY` 聚合、告警（查询+触发+通知渠道）、投递（OSS CSV、MaxCompute、DataHub）、消费组 Consumer Group（按游标拉取，至少一次语义，位点保存）
- ARMS：应用监控（Java Agent / Python SDK / ...）、浏览器前端监控（JS SDK）、调用链 Trace（Span ID/Trace ID）、异常分析、慢 SQL 诊断、自定义监控上报
- Prometheus 监控 for Kubernetes：ACK 默认一键启用、Exporter（node-exporter/kube-state-metrics/黑盒）、ServiceMonitor/PodMonitor CRD、告警规则、Grafana 大盘（ACK 自带集成地址）
- 降噪与联动：告警分组（按 Label 聚合）、抑制规则（父告警发后抑制子告警）、静默窗口、钉钉/短信/邮件/自定义 Webhook 通知、与云监控 EventBridge 联动

- [ ] **Step 1: 补齐 obs01~20（含 obs07）共 20 题**
- [ ] **Step 2: 验收脚本 T2 可观测与监控 ≥20**

---

## Task 7：填充"发布与部署策略"14 题（rel01~14）

**Files:**
- Modify: `acp-quiz/questions-devops.js`（rel 区块补齐 14：6 单 / 7 多 / 1 判，含 rel08）

子主题清单：
- 策略对比：停机发布 / 滚动发布（默认 k8s Deployment RollingUpdate）/ 蓝绿发布 / 灰度发布金丝雀 / A/B 测试 与适用场景；零停机 vs 非零停机
- ACK 原生滚动：`maxSurge` / `maxUnavailable` 参数组合；回滚 `kubectl rollout undo` / 历史 revision
- 灰度发布实现方式：ACK Flagger + ASM（权重切分 / Header 路由 / Cookie 路由）；Nginx Ingress `canary` 注解；云效 Flow 灰度阶段
- 流水线发布质量门禁：SonarQube（代码异味/漏洞/覆盖率阈值）、OWASP Dependency Check / Trivy（依赖 / 镜像漏洞阻断）、JUnit / Pytest 覆盖率阈值、制品扫描门禁、自动化 UI/E2E 测试
- 回滚：代码版本 / 镜像版本 / 配置版本 / DB schema 迁移版本四者的一致性回滚原则；版本不可变；发布"三窗口"（冒烟 5 分钟 / 小比例 30 分钟 / 全量后 2 小时监控）
- 影子流量 / 流量镜像：把生产流量以无损方式复制一份发给新实例做比对

- [ ] **Step 1: 补齐 rel01~14（含 rel08）共 14 题，判题仅有 1 道（rel 判题最少）**
- [ ] **Step 2: 验收脚本 T2 发布与部署策略 ≥14，题型 judge=1**

---

## Task 8：填充"微服务与服务治理"20 题（mse01~20）

**Files:**
- Modify: `acp-quiz/questions-devops.js`（mse 区块补齐 20：9 单 / 9 多 / 2 判，含 mse04）

子主题清单：
- MSE 注册配置中心：协议支持（Nacos 2.x gRPC / ZooKeeper / Eureka）、命名空间（环境隔离 dev/staging/prod）、Group + DataId（业务隔离）、配置加密（KMS）、配置灰度 Beta 推送、配置版本回溯、监听模型（长轮询 / gRPC Stream）、持久化机制
- MSE 云原生网关：替代 Ingress 的七层能力；路由（路径 / Host / Header / Query / 方法）、JWT/OIDC 认证、限流（滑动窗口 / 令牌桶）、IP 黑白名单、跨域、WAF 集成
- MSE 服务治理：标签路由（按版本号打标签切流）、全链路灰度（泳道 Lane）、限流熔断（Sentinel 兼容）、离群摘除（对异常实例自动摘除）、热点参数限流、单机与集群限流区别
- ASM / Istio：Sidecar 自动注入、VirtualService（路由规则 / 权重 / Header 匹配 / 超时 / 重试）、DestinationRule（Subset/版本、熔断策略、mTLS 模式）、Gateway（入口）、流量镜像 mirror、故障注入 abort / delay、mTLS STRICT / PERMISSIVE / DISABLE 三种模式
- 可观测：MSE / ASM 与 ARMS 应用监控（调用链、拓扑）、SLS 日志（访问日志/审计）、Prometheus 指标（QPS/RT/错误率）集成
- 南北向 vs 东西向：南北（网关 Ingress）；东西（服务间调用，靠 Sidecar Envoy 拦截治理）

- [ ] **Step 1: 补齐 mse01~20（含 mse04）共 20 题；最终 DEVOPS_QUESTIONS.length === 140 达成**
- [ ] **Step 2: 验收脚本全部断言通过**
```powershell
node outputs/acp-devops-verify.js
```
Expected: ✅ PASSED（T1~T6 全绿）

---

## Task 9：quiz.html 引入 questions-devops.js

**Files:**
- Modify: `quiz.html:105-109`（在 questions-extra.js 之后、questions-bank.js 之前新增一行）

- [ ] **Step 1: 修改 quiz.html script 引入块，严格以下列顺序**

目标片段：
```html
<script src="app.js"></script>
<script src="exam-config.js"></script>
<script src="acp-quiz/questions-data.js"></script>
<script src="acp-quiz/questions-rds.js"></script>
<script src="acp-quiz/questions-extra.js"></script>
<script src="acp-quiz/questions-devops.js"></script>  <!-- 新增：ACP DevOps 专属题 140 -->
<script src="questions-bank.js"></script>
```

- [ ] **Step 2: 语法检查（本地起静态服务器 + DevTools，或用 node html-validate 轻量验证）**
```powershell
# 推荐方式（Windows PowerShell）
python -m http.server 8090
# 然后浏览器打开
# http://localhost:8090/quiz.html?exam=acp-devops&mode=practice
# 控制台无 ReferenceError: DEVOPS_QUESTIONS is not defined
```

---

## Task 10：questions-bank.js 改造（合并 + 双段过滤）

**Files:**
- Modify: `questions-bank.js:46-63, 73-83`

- [ ] **Step 1: 先做 (a) EXTRA_QUESTIONS 合并 DEVOPS_QUESTIONS**

将 `const EXTRA_QUESTIONS = []...` 改为：
```js
/* RDS 与扩展考点、ACP DevOps 专属题库为独立文件，合并进全局题库 */
const EXTRA_QUESTIONS = []
    .concat((typeof RDS_QUESTIONS         !== 'undefined') ? RDS_QUESTIONS         : [])
    .concat((typeof EXTRA_TOPIC_QUESTIONS !== 'undefined') ? EXTRA_TOPIC_QUESTIONS : [])
    .concat((typeof DEVOPS_QUESTIONS      !== 'undefined') ? DEVOPS_QUESTIONS      : []);
```

- [ ] **Step 2: 插入 (b) DEVOPS_CORE_TOPICS / DEVOPS_FILL_TOPICS 常量 & (c) 改 EXAM_MODULES**

紧接 EXTRA_QUESTIONS 之后（在 `const QUESTION_BANK = dedupeQuestions(...)` 之前）插入：
```js
/* ACP DevOps 双段过滤配置：7 大核心域优先抽 minPrimary 题，不足再用云基础设施域补齐 */
const DEVOPS_CORE_TOPICS = [
    '云效DevOps平台', '容器服务ACK', '容器镜像ACR',
    'IaC与运维编排', '可观测与监控', '发布与部署策略', '微服务与服务治理'
];
const DEVOPS_FILL_TOPICS = ['弹性伸缩', '负载均衡SLB', '云计算通用', '云服务器ECS'];
```

然后将 `EXAM_MODULES['acp-devops']` 从数组改为对象：
```js
const EXAM_MODULES = {
    'aca-cloud':       null,
    'aca-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-cloud':       null,
    'acp-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-devops':      { primary: DEVOPS_CORE_TOPICS, fill: DEVOPS_FILL_TOPICS, minPrimary: 35 },
    'ace-cloud':       null,
    'ace-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用']
};
```

- [ ] **Step 3: (d) 重写 `getQuestionsForExam` 兼容对象 / 数组 / null 三分支**

替换整个 `function getQuestionsForExam(examCode, extraQuestions)`：
```js
function getQuestionsForExam(examCode, extraQuestions) {
    const all = dedupeQuestions([
        ...(extraQuestions || []).map(q => normalizeQ(q)),
        ...QUESTION_BANK
    ]);
    const rule = EXAM_MODULES[examCode];

    /* ---- 分支 A：对象格式（双段优先，当前 acp-devops 采用）---- */
    if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
        const primaryPool = shuffleArray(all.filter(q => rule.primary.includes(q.topic)));
        const fillPool    = shuffleArray(all.filter(q => rule.fill.includes(q.topic)));
        const needPrimary = Math.min(rule.minPrimary || 0, primaryPool.length, 50);
        const picked = primaryPool.slice(0, needPrimary);
        const seen = new Set(picked.map(q => q.question.trim()));
        for (const q of fillPool) {
            if (picked.length >= 50) break;
            const k = q.question.trim();
            if (seen.has(k)) continue;
            seen.add(k); picked.push(q);
        }
        /* 终极兜底（题库规模极小时，从全库去重补至 50） */
        for (const q of shuffleArray(all.slice())) {
            if (picked.length >= 50) break;
            const k = q.question.trim();
            if (seen.has(k)) continue;
            seen.add(k); picked.push(q);
        }
        return picked.slice(0, 50);
    }

    /* ---- 分支 B：数组（单段白名单过滤，沿用原行为）---- */
    if (Array.isArray(rule)) {
        let pool = all.filter(q => rule.includes(q.topic));
        if (pool.length === 0) pool = all;
        shuffleArray(pool);
        return pool.slice(0, Math.min(50, pool.length));
    }

    /* ---- 分支 C：null（全库随机抽取）---- */
    return shuffleArray(all.slice()).slice(0, 50);
}
```

- [ ] **Step 4: 用 Node 快速跑冒烟测试（可选但推荐）**
将 questions-bank.js 的关键函数在 Node 里执行（直接把 getQuestionsForExam 拷进临时脚本、或给验收脚本的 `pickForExam` 换为对实际 `questions-bank.js` 读取，只要跑 `node outputs/acp-devops-verify.js` 仍是 PASSED 即说明实现等价）：

```powershell
node outputs/acp-devops-verify.js
```
Expected: ✅ PASSED。

---

## Task 11：更新 README.md 文档

**Files:**
- Modify: `README.md:12, 47-51, 67-82` 四处

- [ ] **Step 1: 功能特性里题数更新 + 知识点补 7 主域（L12）**

原文：
```
- **203 道去重题库**：覆盖 ECS、OSS、VPC、RDS、PolarDB、NAS、SLB、安全组、弹性伸缩、RAM、NAT 网关、云监控、CDN、成本优化、Web安全等核心知识点
```
改为：
```
- **343 道去重题库**：覆盖 ECS、OSS、VPC、RDS、PolarDB、NAS、SLB、安全组、弹性伸缩、RAM、NAT 网关、云监控、CDN、成本优化、Web安全，及 ACP DevOps 7 大域（云效平台 / 容器服务ACK / 容器镜像ACR / IaC ROS·Terraform·OOS / 可观测 SLS·ARMS·Prometheus / 发布部署策略 / 微服务治理 MSE·ASM）
```

- [ ] **Step 2: 项目结构图补上 questions-devops.js 一行**
```
└── acp-quiz/
    ├── questions-data.js   # 主题库（160 题）
    ├── questions-rds.js    # RDS 题库（18 题）
    ├── questions-extra.js  # 扩展考点题库（25 题：NAS/PolarDB/VPC/成本优化/云监控/安全）
    └── questions-devops.js # ACP DevOps 题库（140 题：云效/ACK/ACR/IaC/可观测/发布策略/微服务）
```

- [ ] **Step 3: 快速开始 URL 表新增 ACP DevOps 两行**
```
| ACP DevOps | `quiz.html?exam=acp-devops&mode=practice` | `quiz.html?exam=acp-devops&mode=exam` |
```

- [ ] **Step 4: 题库说明表新增一行（L82 之前）**
```
| `acp-quiz/questions-devops.js` | 140 | 云效 DevOps 平台、容器服务 ACK、容器镜像 ACR、IaC（ROS/Terraform/OOS）、可观测（SLS/ARMS/Prometheus）、发布部署策略、微服务治理（MSE/ASM） |
```

---

## Task 12（可选）：certifications.html 对齐 ACP DevOps 知识域文字

**Files:**
- Modify: `certifications.html:706-714`（`acp-devops.topics` 数组末尾补 2 条，不影响功能）

- [ ] **Step 1: 在现有 8 条 topics 后追加如下 2 条**
```js
'容器与 Kubernetes：ACK 集群类型、CNI（Flannel/Terway）、CSI 存储、工作负载与 Helm、Ingress 网关',
'微服务治理：MSE 注册配置中心（Nacos）、标签路由与全链路灰度、ASM/Istio 服务网格、mTLS 与流量治理'
```

---

## Task 13：端到端 UI 走查 & 验收

**Files:** 不新增；使用 `outputs/acp-devops-verify.js` + 浏览器

- [ ] **Step 1: 命令行最终 PASS**
```powershell
node outputs/acp-devops-verify.js
```
Expected：`✅ PASSED 全部 6 类断言通过`

- [ ] **Step 2: 启动本地 HTTP 服务**
```powershell
python -m http.server 8090
```

- [ ] **Step 3: 浏览器手工回归以下 7 个 URL，每个抽题 1 次，要求均无控制台报错、题数 = 50**

| URL | 期望 |
|---|---|
| `http://localhost:8090/quiz.html?exam=aca-cloud&mode=practice` | 50 题，云计算通用内容 |
| `http://localhost:8090/quiz.html?exam=acp-cloud&mode=practice` | 50 题 |
| `http://localhost:8090/quiz.html?exam=acp-security&mode=practice` | 50 题，安全/VPC/ECS 居多 |
| `http://localhost:8090/quiz.html?exam=acp-devops&mode=practice` | 50 题，前 35 题里"云效 / ACK / ACR / IaC / 可观测 / 发布策略 / 微服务"主题合计 ≥ 35 |
| `http://localhost:8090/quiz.html?exam=acp-devops&mode=exam` | 同样 50 题，计时模式正常显示 |
| `http://localhost:8090/quiz.html?exam=ace-cloud&mode=practice` | 50 题，大题库 shuffle |
| `http://localhost:8090/quiz.html?exam=aca-security&mode=practice` | 50 题 |

- [ ] **Step 4: 任选一道 DevOps 题验证"解析 / ref / 选项索引"**：进练习模式，随机挑 5 道（每个类型各 1 道：单 / 多 / 判）提交答案，看解析对选项的解释与答案对不对。

- [ ] **Step 5: 代码提交（如使用 git）**
```bash
git add acp-quiz/questions-devops.js quiz.html questions-bank.js README.md certifications.html outputs/acp-devops-verify.js
git commit -m "feat(acp-devops): add 140 DevOps questions & 2-tier exam filter (total bank 203->343)"
```

---

## 🎯 最终交付 Checklist

- [ ] 新文件 `acp-quiz/questions-devops.js` 存在，`DEVOPS_QUESTIONS.length === 140`
- [ ] `node outputs/acp-devops-verify.js` ✅ PASS
- [ ] `quiz.html` 引入顺序正确（`questions-devops.js` 在 `questions-bank.js` 前）
- [ ] `questions-bank.js` 三分支实现 & `EXAM_MODULES['acp-devops']` 为对象格式
- [ ] `README.md` 四处文案更新到 343 题、有 ACP DevOps URL
- [ ] 浏览器 7 条 URL 无报错、题数 50
- [ ] ACP DevOps 一场 50 题中 DevOps 7 主域题 ≥ 35（≥ 70%）

---

## Plan Self-Review（Spec 覆盖核对）

| Spec § 章节 | 对应 Task |
|---|---|
| §1 方案路径 1（单文件 + 双段过滤） | T1 骨架 → T10 quiz/qs-bank 合并改造 |
| §2 140 题分布表 / 7 主域 / 字段契约 | T2~T8 按域写题 + §2.1 字段由 T3 verify 脚本断言 |
| §3 ACP DevOps 双段策略（对象格式 / primary+fill+minPrimary / 通用双段实现非写死） | T10 Step 1~4 |
| §4 文件改动清单 5 项 + 可选 1 项 | T1/T9/T10/T11/T12 |
| §5 质量验收 3 大项（题数/分布/字段/去重、抽题策略、浏览器 UI） | T0 脚本 + T13 走查 |
| §6 7 样例题锚点纳入正文 | T1 Step 1 已显式写入 7 题 |
| §7 范围边界 / 不做事项 | Plan 中未出现被明确禁止的任务（npm / 重写旧题 / 新增其它考试方向…） |
| §8 风险缓解 | 验证脚本 = 语法解析防线；T3 重叠查重 = 撞题防线；T2 topic 分布断言 = 拼写防线；getQuestionsForExam 对象通用分支 = 扩展性防线；锚点题先行 = 质量一致性防线 |

**占位符扫描：** Plan 内 0 处 TBD / TODO / 占位 / "类似 Task X"。所有 code step 均有完整代码段。
**类型一致性：** `DEVOPS_QUESTIONS`、`DEVOPS_CORE_TOPICS`、`DEVOPS_FILL_TOPICS`、`EXAM_MODULES['acp-devops']`、`pickForExam` 四个引用点的命名、结构、7 主域字符串完全一致（`云效DevOps平台`、`容器服务ACK`、`容器镜像ACR`、`IaC与运维编排`、`可观测与监控`、`发布与部署策略`、`微服务与服务治理`），无一处拼写差异。
