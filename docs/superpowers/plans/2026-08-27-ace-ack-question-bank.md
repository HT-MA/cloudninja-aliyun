# ACE ACK 容器服务专项（140 题 · 76% 纯度）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`（recommended）或 `superpowers:executing-plans` 按 task 顺序逐项执行。Steps 全部使用 checkbox（`- [ ]`）语法用于跟踪。
>
> **已激活的 workspace skill 必须贯穿全程**：`.trae/skills/generate-topic-question-bank/SKILL.md` —— 其 Red Flags、Input Contract、6 类断言结构、双段 engine 契约、Playwright 必选要求 **全部为硬约束，不得与本计划冲突**。

**目标：** 在现有 quiz 项目中新增 `ace-ack`（阿里云ACE级·容器服务ACK专项）考试方向，新增 140 道独立 ACK 水准题，抽 50 题时 ≥38 题来自 7 个 ACK 核心域（76% 纯度），同时 7 个既有考试方向零回归、Playwright 8 URL 全部 total=50、consoleErr=0。

**架构：** 延续 acp-devops 改造使用的「题库文件独立 → EXTRA_QUESTIONS typeof 防御式合并 → EXAM_MODULES 对象双段 rule → getQuestionsForExam 三分支通用」同构模式；quiz.html 以 `<script>` 顺序保证 bank 计算时常量已就绪；断言脚本 6 类 TDD 先红后绿；Playwright E2E 8 URL 作为最终交付门槛。

**技术栈：** HTML + 原生 `<script>` 题 bank、Node.js（验收脚本与 Playwright runner 均为 `node 输出文件`）、Playwright、内置 Python `http.server`（或 Node 等价）做本地静态托管。

---

## 文件结构总览（File Structure Map）

### 新建（Create）
1. `acp-quiz/questions-ack.js` — 140 道 ACK 题目；module 值严格 = ACK_CORE_TOPICS 7 项
2. `outputs/ace-ack-verify.js` — 6 类 TDD 断言脚本，T1 写死 N=140 / BANK=483
3. `docs/superpowers/plans/2026-08-27-ace-ack-question-bank.md` — **本文件**
4. `docs/superpowers/specs/2026-08-27-ace-ack-question-bank-design.md` — **已在 brainstorming 阶段创建并自审通过**

### 修改（Modify）
5. `questions-bank.js:47-51` — EXTRA_QUESTIONS 合并 ACK_QUESTIONS 分支
6. `questions-bank.js:53-58` — 紧接 DEVOPS 常量后，加 ACK_CORE_TOPICS / ACK_FILL_TOPICS
7. `questions-bank.js:63-71` — EXAM_MODULES 对象内加 `'ace-ack': { primary, fill, minPrimary:38 }`
8. `quiz.html` — 在 `questions-devops.js <script>` **之后**、`questions-bank.js <script>` 之前插入 `questions-ack.js <script>`
9. `README.md` — 343→483 数字、项目结构树、题库表、快速开始表 URL 共 4 处
10. `certifications.html` — 新增 ace-ack 卡片（标题/描述/topics 7 项/URL 四要素）
11. `outputs/playwright-e2e.js` — EXAMS 列表从 7 → 8 条，ace-ack 要求 metaKeys ≥5/7；acp-devops 保留 ≥5

### 测试（Test）
12. `outputs/ace-ack-verify.js` 必须 RED→GREEN；`outputs/playwright-e2e.js` 必须 8/8 PASS
13. 不得引入未在本计划中登记的临时 .js/.md 文件；临时验证脚本运行后必须立即删除（Skill 规定的"不造噪音"）

---

## Task 1 · 写入 6 类断言脚本（TDD RED：先跑 FAIL）

**Files:**
- Create: `outputs/ace-ack-verify.js`
- Depends: `questions-bank.js`（读取 normalizeQ / dedupeQuestions / EXAM_MODULES / getQuestionsForExam 规则）

**关键实现注意（来自 Skill 合理化借口 Reality）**：
- 总量断言写死 N=140 & BANK_AFTER=483，**不允许**从 ACK_QUESTIONS.length 反推
- T2 域分布 & 每域单/多/判三元组使用**硬编码 7 个对象**（非可配置），与 Spec §1-5/6 字节级对应
- T4 必须对 343 旧题库做 normalized 去重，需要手动把 questions-data.js / RDS_QUESTIONS / EXTRA_TOPIC_QUESTIONS / DEVOPS_QUESTIONS 全部 load 进来
- T5 调用 `getQuestionsForExam('ace-ack', 50)` 连跑 5 次，**每次** primary 计数 ≥38 && length===50
- T6 跑 7 个考试 code；对 acp-devops 额外断言 primary≥35（防止破坏已有对象 rule）

- [ ] **Step 1: Write outputs/ace-ack-verify.js 完整脚本**

```js
/* outputs/ace-ack-verify.js - 6 类断言，TDD RED 版本 */
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.resolve(__dirname, '..');
function loadGlobal(files, label='') {
    const sandbox = { console, Array, Object, JSON, Number, String, Boolean, Set, Map, Math, Date };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    for (const f of files) {
        const full = path.join(ROOT, f);
        if (!fs.existsSync(full)) { console.log(`[SKIP] ${label || 'loadGlobal'} missing ${f}`); continue; }
        const src = fs.readFileSync(full, 'utf8');
        try { vm.runInContext(src, sandbox, { filename: full }); }
        catch (e) { console.log(`[WARN] ${f} eval failed: ${e.message}`); }
    }
    return sandbox;
}

// ---- 输入契约硬编码（来自 Spec §1，禁止改为"读文件推断"） ----
const N = 140;
const BANK_AFTER = 483; // 343 + 140
const EXAM = 'ace-ack';
const CORE_TOPICS = ['集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测'];
const FILL_TOPICS = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS','专有网络VPC','云数据库RDS','容器服务ACK','云效DevOps平台'];
const DISTRIBUTION = { '集群生命周期':20, '网络与Ingress':22, '存储':20, '工作负载':22, '可靠性与弹性伸缩':18, '安全与治理':18, '运维与可观测':20 };
const TYPE_RATIOS  = { '集群生命周期':[11,6,3], '网络与Ingress':[12,7,3], '存储':[11,6,3], '工作负载':[12,7,3], '可靠性与弹性伸缩':[9,6,3], '安全与治理':[9,6,3], '运维与可观测':[11,6,3] };
const ABBR = { '集群生命周期':'life', '网络与Ingress':'net', '存储':'store', '工作负载':'work', '可靠性与弹性伸缩':'hpa', '安全与治理':'sec', '运维与可观测':'ops' };
const MIN_PRIMARY = 38;
const OTHER_EXAMS = ['aca-cloud','aca-security','acp-cloud','acp-security','acp-devops','ace-cloud','ace-security'];
const REGRESS_PRIMARY = { 'acp-devops':35 };

function normalize(s) { return (s || '').replace(/\s+/g,'').replace(/[\p{P}]/gu,'').toLowerCase(); }

function ok(label, cond, detail='') {
    if (!cond) { console.log(`❌ ${label} FAIL ${detail}\n`); process.exit(1); }
    console.log(`[${label}] OK${detail?`：${detail}`:''}`);
}

// ---- 加载 ----
// 先 load ACK 题库（如果还没创建，这里就会 undefined，T1 正确 FAIL）
let ACK_QUESTIONS;
try {
    const ackFull = path.join(ROOT, 'acp-quiz/questions-ack.js');
    if (fs.existsSync(ackFull)) {
        const sb = loadGlobal(['acp-quiz/questions-ack.js'], 'ack-only');
        ACK_QUESTIONS = sb.ACK_QUESTIONS;
    }
} catch (_) { ACK_QUESTIONS = undefined; }

// 然后 load 旧题库（questions-data + extra + rds + devops）并把 ACK 注入后再 load bank
const sb = loadGlobal([
    'questions-data.js', 'questions-rds.js', 'questions-extra-topics.js',
    'acp-quiz/questions-devops.js', 'acp-quiz/questions-ack.js'
], 'all');
// 合并 bank（这里完全复用 questions-bank 的常量，但避免依赖 QUESTIONS 宏变量，因为 require 会因为 QUESTIONS 不存在报错）
const devops = (typeof sb.DEVOPS_QUESTIONS === 'undefined') ? [] : sb.DEVOPS_QUESTIONS;
const rds    = (typeof sb.RDS_QUESTIONS === 'undefined') ? [] : sb.RDS_QUESTIONS;
const extra  = (typeof sb.EXTRA_TOPIC_QUESTIONS === 'undefined') ? [] : sb.EXTRA_TOPIC_QUESTIONS;
const baseQs = (typeof sb.QUESTIONS === 'undefined') ? [] : sb.QUESTIONS;
const ack    = ACK_QUESTIONS ? ACK_QUESTIONS : ((typeof sb.ACK_QUESTIONS === 'undefined') ? [] : sb.ACK_QUESTIONS);

const TYPE_MAP = {single:'单选题', multi:'多选题', judge:'判断题'};
const TOPIC_MAP = {ECS:'云服务器ECS',OSS:'对象存储OSS',VPC:'专有网络VPC',RDS:'云数据库RDS',SLB:'负载均衡SLB','安全组':'云安全','云监控':'云计算通用','弹性伸缩':'弹性伸缩',RAM:'云安全','NAT网关':'专有网络VPC','快照':'云服务器ECS',CDN:'内容分发CDN'};
function nq(q,prefix){ const ca = q.correctAnswers || q.answer || [q.correctAnswer]; const t=q.type||'single'; return {id:prefix?prefix+'_'+q.id:q.id, topic:q.module||TOPIC_MAP[q.topic]||q.topic||'云计算通用', difficulty:q.difficulty||(t==='multi'?'中等':'简单'), type:TYPE_MAP[t]||t, question:q.question, options:q.options, correctAnswers:ca, explanation:q.explanation, ref:q.ref, _rawType:t}; }
function dedupe(list){ const seen=new Set(); const r=[]; for(const q of list){ const k=(q.question||'').trim(); if(seen.has(k))continue; seen.add(k); r.push(q);} return r;}
const ALL_RAW = [].concat(rds).concat(extra).concat(devops).concat(ack).concat(baseQs);
const BANK = dedupe(ALL_RAW.map(q => nq(q)));

// ---- T1 基础计数 ----
ok('T1 基础计数', (Array.isArray(ACK_QUESTIONS) && ACK_QUESTIONS.length===N && BANK.length===BANK_AFTER),
   `ACK=${Array.isArray(ACK_QUESTIONS)?ACK_QUESTIONS.length:'NA'}，合并去重后 BANK=${BANK.length}（期望 ${N} / ${BANK_AFTER}）`);

// ---- T2 域分布 & 单/多/判断三元组 ----
const byMod = {}; const byModType = {};
for (const mod of CORE_TOPICS) { byMod[mod]=0; byModType[mod]={single:0,multi:0,judge:0}; }
for (const q of ACK_QUESTIONS) {
    ok('T2 module 合法', !!byMod.hasOwnProperty(q.module), `非法 module=${q.module} (id=${q.id})`);
    byMod[q.module]++;
    byModType[q.module][q.type]++;
}
for (const mod of CORE_TOPICS) {
    ok(`T2 ${mod} 题量`, byMod[mod]===DISTRIBUTION[mod], `${byMod[mod]}/${DISTRIBUTION[mod]}`);
    const [s,m,j] = TYPE_RATIOS[mod];
    const got = byModType[mod];
    ok(`T2 ${mod} 题型比`, got.single===s && got.multi===m && got.judge===j,
       `单${got.single}/${s} 多${got.multi}/${m} 判${got.judge}/${j}`);
    ok(`T2 ${mod} 三元组和=域题量`, (s+m+j)===DISTRIBUTION[mod] && (got.single+got.multi+got.judge)===DISTRIBUTION[mod]);
}

// ---- T3 字段 / 索引 / 格式 ----
const TYPE_ALLOW = new Set(['single','multi','judge']);
const ALLOW_REF = /^https?:\/\/help\.aliyun\.com/i;
const ABBR_REVERSE = Object.fromEntries(Object.entries(ABBR).map(([k,v])=>[v,k]));
for (const q of ACK_QUESTIONS) {
    ok('T3 字段齐全', ['id','module','type','question','options','answer','explanation','ref'].every(k=>k in q), `缺字段 id=${q.id}`);
    ok('T3 type 合法', TYPE_ALLOW.has(q.type), `id=${q.id} type=${q.type}`);
    ok('T3 id 前缀', /^aceack_(life|net|store|work|hpa|sec|ops)\d{2}$/.test(q.id),
       `id=${q.id} 不匹配 aceack_<域缩写><2位序号>（例如 aceack_net01）`);
    // id 前缀必须与 module 一致（防止手误 life 前缀题写进 ops 域）
    const prefix = q.id.match(/^aceack_(life|net|store|work|hpa|sec|ops)\d{2}$/);
    if (prefix) ok('T3 id 前缀↔module 一致', ABBR_REVERSE[prefix[1]]===q.module,
                   `id=${q.id} 前缀${prefix[1]} → ${ABBR_REVERSE[prefix[1]]}，但 module=${q.module}`);
    if (q.type === 'judge') {
        ok('T3 judge options=2', Array.isArray(q.options) && q.options.length===2, `id=${q.id}`);
        ok('T3 judge 文案正确/错误', JSON.stringify(q.options) === JSON.stringify(['正确','错误']), `id=${q.id}`);
    } else {
        ok('T3 options 4 项', Array.isArray(q.options) && q.options.length===4, `id=${q.id} len=${q.options&&q.options.length}`);
    }
    ok('T3 answer 数组', Array.isArray(q.answer) && q.answer.length>=1, `id=${q.id}`);
    if (q.type==='single' || q.type==='judge') {
        ok('T3 single/judge answer 长度=1', q.answer.length===1, `id=${q.id} len=${q.answer.length}`);
    }
    if (q.type==='multi') {
        ok('T3 multi answer 升序无重复', q.answer.slice().sort((a,b)=>a-b).join(',')===q.answer.join(',') && new Set(q.answer).size===q.answer.length, `id=${q.id} answer=${q.answer}`);
        ok('T3 multi answer len 2~4', q.answer.length>=2 && q.answer.length<=4, `id=${q.id}`);
        // explanation 必须包含 A./B./C./D. 顺序
        const letters = q.options.map((_,i)=>String.fromCharCode(65+i)).join('|');
        ok('T3 multi 解析按 A/B/C/D 展开', new RegExp(`[Aa]\\.\\s*[\\s\\S]*[Bb]\\.\\s*[\\s\\S]*[Cc]\\.\\s*[\\s\\S]*[Dd]\\.`).test(q.explanation),
           `id=${q.id} 解析未按 A./B./C./D. 展开`);
    }
    for (const a of q.answer) ok('T3 answer 索引合法', Number.isInteger(a) && a>=0 && a<q.options.length, `id=${q.id} ans=${a} options.len=${q.options.length}`);
    if (q.ref && q.ref.length) {
        ok('T3 ref 域名（help.aliyun.com）', ALLOW_REF.test(q.ref) || /help\.aliyun\.com/.test(q.ref), `id=${q.id} ref=${q.ref}`);
    }
}

// ---- T4 去重（内部 id 唯一；内部 normalized question 唯一；与旧库 343 题 overlap=0）----
const ids = new Set(); const normQ = new Set(); const overlap = [];
for (const q of ACK_QUESTIONS) {
    ok('T4 id 唯一', !ids.has(q.id), `重复 id=${q.id}`); ids.add(q.id);
    const nk = normalize(q.question + (q.options||[]).join('|'));
    ok('T4 内部 normalized 去重', !normQ.has(nk), `疑似重复题干：id=${q.id}`); normQ.add(nk);
}
// 与旧库 overlap（rds + extra + devops + baseQs，但注意 ACK 已并入 ack 变量，这里只取非 ACK 的）
const OLD = [].concat(rds).concat(extra).concat(devops).concat(baseQs);
for (const q0 of OLD) {
    const nk0 = normalize((q0.question||'') + ((q0.options||[]).join('|')));
    if (normQ.has(nk0)) overlap.push(q0.question);
}
ok('T4 与旧库 overlap=0', overlap.length===0, `overlap=${overlap.length}：\n    - ${overlap.slice(0,10).join('\n    - ')}` + (overlap.length>10?`\n    ... 其余 ${overlap.length-10} 条省略`:''));

// ---- T5 双段抽题（5 场，primary ≥38）注意：此处用 BANK 重现 getQuestionsForExam 逻辑
function shuffle(a){ const x=a.slice(); for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]];} return x;}
function drawAceAck(count=50){
    const primaryPool = shuffle(BANK.filter(q=>CORE_TOPICS.includes(q.topic)));
    const fillPool    = shuffle(BANK.filter(q=>FILL_TOPICS.includes(q.topic) && !CORE_TOPICS.includes(q.topic)));
    let picked = primaryPool.slice(0, count);
    if (picked.length < count) picked = picked.concat(fillPool.slice(0, count - picked.length));
    // 再去重 / cut
    const seen2=new Set(); const r=[];
    for(const q of picked){ if(seen2.has(q.question.trim()))continue; seen2.add(q.question.trim()); r.push(q); if(r.length>=count)break;}
    if(r.length<count) return { length:r.length, primaryCount:-1, err:'不足50题'};
    return { length:r.length, primaryCount:r.filter(q=>CORE_TOPICS.includes(q.topic)).length };
}
for (let i = 1; i <= 5; i++) {
    const r = drawAceAck(50);
    ok(`T5-${i} 试卷`, r.length===50 && r.primaryCount>=MIN_PRIMARY,
       `题数=${r.length} primary=${r.primaryCount}（≥${MIN_PRIMARY}）`);
}

// ---- T6 回归：7 个旧考试方向各自一场 = 50（这里按 EXAM_MODULES 的数组/对象 rule 重现）
const RULES = {
    'aca-cloud':    null,
    'aca-security': ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-cloud':    null,
    'acp-security': ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-devops':   { primary:['云效DevOps平台','容器服务ACK','容器镜像ACR','IaC与运维编排','可观测与监控','发布与部署策略','微服务与服务治理'], fill:['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS'], minPrimary:35 },
    'ace-cloud':    null,
    'ace-security': ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用']
};
function drawGeneric(code, count=50){
    const rule = RULES[code];
    if (rule === null) return shuffle(BANK).slice(0, count);
    if (Array.isArray(rule)) return shuffle(BANK.filter(q=>rule.includes(q.topic))).slice(0, count);
    if (rule && typeof rule==='object') {
        const p = shuffle(BANK.filter(q=>rule.primary.includes(q.topic))).slice(0, count);
        const need = count - p.length;
        let list = p;
        if (need>0) list = p.concat(shuffle(BANK.filter(q=>rule.fill.includes(q.topic))).slice(0, need));
        const seen=new Set(); const r=[];
        for(const q of list){ if(seen.has(q.question.trim()))continue; seen.add(q.question.trim()); r.push(q); if(r.length>=count)break;}
        r._primaryCount = r.filter(q=>rule.primary.includes(q.topic)).length;
        return r;
    }
    return [];
}
for (const code of OTHER_EXAMS) {
    const list = drawGeneric(code, 50);
    ok(`T6 回归 ${code}`, list && list.length===50, `题数=${list && list.length}（期望 50）`);
    if (REGRESS_PRIMARY[code]) {
        ok(`T6 回归 ${code} primary≥${REGRESS_PRIMARY[code]}`, list._primaryCount>=REGRESS_PRIMARY[code],
           `primary=${list._primaryCount} < ${REGRESS_PRIMARY[code]}`);
    }
}

console.log('\n✅ PASSED 全部 6 类断言通过');
process.exit(0);
```

- [ ] **Step 2: 跑一次 RED（必须 FAIL）**

Run:
```bash
node outputs/ace-ack-verify.js
echo "EXIT=$LASTEXITCODE"
```
Expected:
- Exit code **非 0**；
- 首个 FAIL 应是 `T1 基础计数`，报 `ACK=NA` 或 `BANK=343（<483）`（因为 questions-ack.js 尚未创建 → ACK_QUESTIONS undefined）。
- 若显示 `✅ PASSED 全部 6 类断言通过`，**立即停**：断言 N=140/BANK=483 写失效 → 回到 Step 1 修复。

- [ ] **Step 3: Commit（仅断言脚本 + spec + 本 plan）**

```bash
git add outputs/ace-ack-verify.js docs/superpowers/specs/2026-08-27-ace-ack-question-bank-design.md docs/superpowers/plans/2026-08-27-ace-ack-question-bank.md
git commit -m "test(ace-ack): add 6-category TDD verify script (RED baseline)

- N=140, BANK=483 hard-coded; T1 FAILs until questions-ack.js exists
- T2: 7 domain quotas + per-domain single/multi/judge ratios (7 triples)
- T3: field/type/judge options/index range/multi sorted ascending/multi
  A./B./C./D. explanation/ref domain check
- T4: internal id unique, normalized dedup, 0 overlap vs 343 old bank
- T5: 5x ace-ack draw (50 q) → each primary >= 38 / 50 (76% purity)
- T6: 7 existing exams 1x 50q; acp-devops still primary >= 35/50

Note: at this commit questions-ack.js does NOT exist yet (RED baseline)."
```

---

## Task 2 · 生成 ACK 题库 140 题（GREEN，跑直到 6/6 PASS）

**Files:**
- Create: `acp-quiz/questions-ack.js`
- Test: `outputs/ace-ack-verify.js`
- Guard: 必须遵循「**先搭骨架（每域 1 道锚题，确保 7 域都有）→ 分域补到配额 → 反复跑断言直至 6/6 PASS**」的顺序。**禁止一次性随机写 140 道再返工**（Skill § 合理化借口 #1 已强杀）

**文件骨架（必须严格，首行不能少）：**
```js
/* acp-quiz/questions-ack.js — ACE 级 容器服务ACK 专项 140 道精选题
 * module 取值严格对应 ACK_CORE_TOPICS（7 项）；id 前缀 aceack_<域缩写><2 位序号>
 * 题型比例（life:11/6/3, net:12/7/3, store:11/6/3, workload:12/7/3, hpa:9/6/3,
 *            sec:9/6/3, ops:11/6/3）合计 单75 + 多44 + 判21 = 140
 */
const ACK_QUESTIONS = [
    // ——— 集群生命周期（life:11/6/3=20）aceack_life01~life20 ———
    { id:'aceack_life01', module:'集群生命周期', type:'single',
      question:'在阿里云容器服务 ACK Pro 版集群创建流程中，以下哪一项是 Kubernetes 控制平面组件（kube-apiserver / etcd / kube-controller-manager / kube-scheduler）的托管模式？',
      options:['由用户通过 ECS 自行部署和运维', '由阿里云完全托管，用户不可见控制平面节点', '每个节点自带控制平面，无需单独部署', '控制平面运行在 Serverless Kubernetes 上'],
      answer:[1],
      explanation:'ACK Pro/Managed 版控制平面（kube-apiserver、etcd 3 副本、kube-controller-manager、kube-scheduler）由阿里云完全托管，用户只需要在控制台创建集群即可使用。',
      ref:'help.aliyun.com/zh/ack/product-overview/kubernetes-cluster-types'
    },
    // ... 继续补 life02..life20（单11/多6/判3）
    // ——— 网络与Ingress（net:12/7/3=22）aceack_net01~net22 ———
    // ——— 存储（store:11/6/3=20）aceack_store01~store20 ———
    // ——— 工作负载（workload:12/7/3=22）aceack_work01~work22 ———
    // ——— 可靠性与弹性伸缩（hpa:9/6/3=18）aceack_hpa01~hpa18 ———
    // ——— 安全与治理（sec:9/6/3=18）aceack_sec01~sec18 ———
    // ——— 运维与可观测（ops:11/6/3=20）aceack_ops01~ops20 ———
];
if (typeof window !== 'undefined') { window.ACK_QUESTIONS = ACK_QUESTIONS; }
if (typeof module !== 'undefined' && module.exports) { module.exports = ACK_QUESTIONS; }
```

**7 域题量计数表（每完成一道手动对齐，避免最后发现差了 1~2 道）：**

| 域 | 前缀 | 单 | 多 | 判 | 域合计 | 序号范围 |
|---|---|---|---|---|---|---|
| 集群生命周期 | life | 11 | 6 | 3 | 20 | life01~life20 |
| 网络与Ingress | net | 12 | 7 | 3 | 22 | net01~net22 |
| 存储 | store | 11 | 6 | 3 | 20 | store01~store20 |
| 工作负载 | workload | 12 | 7 | 3 | 22 | work01~work22 |
| 可靠性与弹性伸缩 | hpa | 9 | 6 | 3 | 18 | hpa01~hpa18 |
| 安全与治理 | sec | 9 | 6 | 3 | 18 | sec01~sec18 |
| 运维与可观测 | ops | 11 | 6 | 3 | 20 | ops01~ops20 |
| **合计** | | **75** | **44** | **21** | **140** | |

**写题规范（每 5 道跑一次断言，不允许最后一起跑）：**
- 多选 explanation 格式固定：`A. 正确，因为…；B. 错误，因为…；C. …；D. …。`（T3 会强制检查是否出现 A./B./C./D.）
- ref 字段优先：ACK 集群 → `help.aliyun.com/zh/ack/…`；ACK 网络 → `help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/user-guide/network-overview`；ACK 存储 → `help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/user-guide/storage-overview`；HPA → `help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/user-guide/horizontal-pod-autoscaler-hpa`；安全 → `help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/security-guide/overview-23`；可观测 → `help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/observability/observability-overview`。**不得写 blog.csdn / jianshu 等第三方链接**（T3 ref 断言会 FAIL）。
- 题库 ref 覆盖率 ≥ 80%（≥112/140 题非空）—— 若 <80%，Red Flags 第 4 条触发，不得提交。

- [ ] **Step 1: 写骨架 + 每域 1 道锚题（共 7 道）**

Run:
```bash
node outputs/ace-ack-verify.js
```
Expected: T1 FAIL（7 ≠ 140，正常 RED→GREEN 中）；T3 对 7 道锚题全部 PASS；T4 overlap=0。

- [ ] **Step 2: 按域批量补齐至配额，每补完一域跑一次断言**

每次一个域全部补齐（例：先 life 从 1→20；然后 net 从 1→22；依此类推）。每补完一域：
```bash
node outputs/ace-ack-verify.js
```
Expected: 仅 T1/T2 未达标；T3/T4 一直 PASS。**不要攒到最后再统一修**。

- [ ] **Step 3: 全量 140 题写毕，跑断言至 6/6 PASS**

Run:
```bash
node outputs/ace-ack-verify.js
```
Expected: **`✅ PASSED 全部 6 类断言通过`**，exit 0。
- `ACK=140, BANK=483`；
- T2 7 域数字精确命中，每域三元组完全匹配；
- T4 与旧库 overlap=0（若非 0，必须改那些题的题干/选项，**不是修 overlap 阈值**—— 按 Skill Red Flags 第 5 条）；
- T5 5 场每场 primary ≥38；
- T6 7 个旧方向每场=50，acp-devops primary≥35 仍保持。

- [ ] **Step 4: Commit**

```bash
git add acp-quiz/questions-ack.js
git commit -m "feat(ace-ack): add 140 ACK specialist questions (7 domains)

Modules: life=20 net=22 store=20 workload=22 hpa=18 sec=18 ops=20
Types : single=75 multi=44 judge=21 (per-domain: S/M/J ratio exactly
        matches spec; every domain judge=3)
IDs   : aceack_<life|net|store|work|hpa|sec|ops><01..NN>; zero overlap
        vs existing 343-question bank (T4 dedup PASS)
Refs  : ≥80% reference help.aliyun.com/zh/ack/* official docs;
        multi-choice explanations cover A./B./C./D. per option (T3)

Verification (outputs/ace-ack-verify.js): 6/6 assertions PASS
  - T1: ACK=140, combined BANK=483
  - T2: 7 quotas + 7 S/M/J triples exact match
  - T3: 140/140 field/index/format + ID<->module consistency
  - T4: 0 internal dup; 0 cross-bank dup
  - T5: 5x ace-ack(50) each primary>=38/50 (>=76% purity)
  - T6: 7 legacy exams still 50/50; acp-devops primary>=35"
```

---

## Task 3 · 接入抽题引擎双段常量 & 新 EXAM_MODULES key

**Files:**
- Modify: `questions-bank.js:46-71`（DEVOPS 常量区 → 追加 ACK；EXTRA_QUESTIONS → 加 ACK 分支；EXAM_MODULES → 加 ace-ack 对象 rule）

- [ ] **Step 1: 在 DEVOPS 常量后追加 ACK 常量与 fill**

把 `questions-bank.js` 现有：
```js
/* ACP DevOps 双段过滤配置：7 大核心域优先抽 minPrimary 题，不足再用云基础设施域补齐 */
const DEVOPS_CORE_TOPICS = [
    '云效DevOps平台', '容器服务ACK', '容器镜像ACR',
    'IaC与运维编排', '可观测与监控', '发布与部署策略', '微服务与服务治理'
];
const DEVOPS_FILL_TOPICS = ['弹性伸缩', '负载均衡SLB', '云计算通用', '云服务器ECS'];
```
改为（直接在下面粘贴）：
```js
/* ACE ACK 专项双段过滤配置：7 大 ACK 核心域优先抽 38 题，不足再用云基础设施池补齐 */
const ACK_CORE_TOPICS = [
    '集群生命周期', '网络与Ingress', '存储', '工作负载',
    '可靠性与弹性伸缩', '安全与治理', '运维与可观测'
];
const ACK_FILL_TOPICS = [
    '弹性伸缩', '负载均衡SLB', '云计算通用', '云服务器ECS',
    '专有网络VPC', '云数据库RDS', '容器服务ACK', '云效DevOps平台'
];
```

- [ ] **Step 2: EXTRA_QUESTIONS 加 ACK_QUESTIONS typeof 分支**
原 EXTRA_QUESTIONS：
```js
const EXTRA_QUESTIONS = []
    .concat((typeof RDS_QUESTIONS         !== 'undefined') ? RDS_QUESTIONS         : [])
    .concat((typeof EXTRA_TOPIC_QUESTIONS !== 'undefined') ? EXTRA_TOPIC_QUESTIONS : [])
    .concat((typeof DEVOPS_QUESTIONS      !== 'undefined') ? DEVOPS_QUESTIONS      : []);
```
改为：
```js
const EXTRA_QUESTIONS = []
    .concat((typeof RDS_QUESTIONS         !== 'undefined') ? RDS_QUESTIONS         : [])
    .concat((typeof EXTRA_TOPIC_QUESTIONS !== 'undefined') ? EXTRA_TOPIC_QUESTIONS : [])
    .concat((typeof DEVOPS_QUESTIONS      !== 'undefined') ? DEVOPS_QUESTIONS      : [])
    .concat((typeof ACK_QUESTIONS         !== 'undefined') ? ACK_QUESTIONS         : []);
```

- [ ] **Step 3: EXAM_MODULES 加 ace-ack 对象 rule**
在 `EXAM_MODULES` 的 `'ace-security'` 条目后加：
```js
    'ace-ack':       { primary: ACK_CORE_TOPICS, fill: ACK_FILL_TOPICS, minPrimary: 38 }
```

- [ ] **Step 4: 用 TDD 断言脚本二次验证（必须仍 6/6 PASS，注意 T6 新增使用 EXAM_MODULES 规则的回归）**

因为 T6 目前是用脚本内的 RULES 常量重现的，**这里追加一次"真实 require 引擎"的烟雾检查**（通过 vm 再跑一次）：
```bash
node outputs/ace-ack-verify.js
```
Expected: **6/6 PASS**，exit 0。

- [ ] **Step 5: Commit**

```bash
git add questions-bank.js
git commit -m "feat(engine): wire ACK_CORE/FILL constants + ace-ack 2-tier rule

- add ACK_CORE_TOPICS (7) + ACK_FILL_TOPICS (8) right after
  DEVOPS_CORE/FILL constants in questions-bank.js
- extend EXTRA_QUESTIONS concat chain with defensive typeof check for
  ACK_QUESTIONS, so quiz.html ordering issues would show up as bank
  shrink (caught by T1=483)
- add EXAM_MODULES['ace-ack'] = {primary,fill,minPrimary:38} as
  object-rule, keeping acp-devops intact
- the generic 3-branch getQuestionsForExam (null/Array/object) is
  reused WITHOUT adding any ace-ack-specific if (per spec 2.3)

Re-run outputs/ace-ack-verify.js: 6/6 PASS including T6 legacy
regression and acp-devops primary>=35 still holds."
```

---

## Task 4 · quiz.html 引入 questions-ack.js（顺序关键）

**Files:**
- Modify: `quiz.html`（在 `acp-quiz/questions-devops.js` 后、`questions-bank.js` 前）

- [ ] **Step 1: Read 并确认 quiz.html 当前 <script> 顺序**

先 Read quiz.html 第 100~115 行，确认：
```
<script src="questions-data.js"></script>
<script src="questions-rds.js"></script>
<script src="questions-extra-topics.js"></script>
<script src="acp-quiz/questions-devops.js"></script>
<script src="questions-bank.js"></script>
```
顺序。如果有变动，按最接近的真实内容插入。**不要假定行号，必须 read 后再 edit。**

- [ ] **Step 2: 在 questions-devops.js 后、questions-bank.js 前插入一行**

最终应当变成：
```html
<script src="acp-quiz/questions-devops.js"></script>
<script src="acp-quiz/questions-ack.js"></script>
<script src="questions-bank.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add quiz.html
git commit -m "feat(quiz.html): inject questions-ack.js before bank eval

- <script src="acp-quiz/questions-ack.js"> added AFTER
  questions-devops.js and BEFORE questions-bank.js so ACK_QUESTIONS is
  defined when EXTRA_QUESTIONS concat runs
- if the order is wrong, outputs/ace-ack-verify.js T1 bank=343 < 483
  fails immediately, and Playwright E2E reports ReferenceError"
```

---

## Task 5 · README.md 4 处文案更新（343 → 483）

**Files:**
- Modify: `README.md`（4 处：总量数字 / 项目结构树 / 题库分布表 / 快速开始 URL 表）

- [ ] **Step 1: Read README.md 全文，定位 4 处**

- [ ] **Step 2: Edit 4 处**
1. 顶部：`目前题库包含 343 道精选题` → `483 道精选题`
2. 项目结构树：在 `acp-quiz/questions-devops.js` 行下补 `acp-quiz/questions-ack.js — ACE 容器服务ACK专项题库（140题/7域）`
3. 题库分布表：追加行 `ace-ack | ACE 容器服务ACK专项 | 76% ACK核心域（38/50）| 集群生命周期/网络与Ingress/存储/工作负载/可靠性与弹性伸缩/安全与治理/运维与可观测`
4. 快速开始表：追加行 `ACE 容器服务ACK专项 | quiz.html?mode=ace-ack`

- [ ] **Step 3: 跑 node 脚本做静态断言（不用起 server，读 README 文本）**
```bash
node -e "const s=require('fs').readFileSync('README.md','utf8'); const checks=[/483.*精选题/,/questions-ack\.js.*140.*7域/,/ace-ack.*76%.*38\/50/,/mode=ace-ack/]; let fail=0; checks.forEach((r,i)=>{ if(!r.test(s)){console.log('FAIL '+i); fail++} }); if(fail) process.exit(1); console.log('README_OK');"
```
Expected: `README_OK`。

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): bump total 343->483 and add ace-ack rows

- total bank size 343 -> 483
- project tree: acp-quiz/questions-ack.js line added
- exam table: ace-ack row with 76% ACK core (38/50)
- quick start: quiz.html?mode=ace-ack row added
- static regex check README_OK (4 placeholders all present)"
```

---

## Task 6 · certifications.html 新增 ace-ack 认证卡片

**Files:**
- Modify: `certifications.html`（在 ace-security 卡片后面追加一张，复用同一 card / tile DOM 结构）

- [ ] **Step 1: Read certifications.html 定位 ace-security 卡片，记录 DOM 结构（class、a 标签、topics 数组写法）**
严禁凭空写结构，**必须 read 后再 edit**，保证新卡片和 ace-security 视觉上完全一致。

- [ ] **Step 2: 插入 ace-ack 卡片，内容如下**
标题：`ACE 容器服务ACK 专项认证（云原生专家路径）`；
description：`面向 Kubernetes 基础设施专家，覆盖集群生命周期、网络、存储、工作负载、弹性伸缩、安全治理与运维可观测全链路；每次模拟考 76% 题目来自 7 大 ACK 核心域（≥38/50）`；
topics：`['集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测']`（严格 7 项，**不得多写或少写**）；
url：`quiz.html?mode=ace-ack`。

- [ ] **Step 3: Node 静态校验**
```bash
node -e "const s=require('fs').readFileSync('certifications.html','utf8'); const checks=['ace-ack','集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测','mode=ace-ack']; let fail=0; checks.forEach((t)=>{ if(!s.includes(t)){console.log('FAIL missing:',t); fail++} }); if(fail) process.exit(1); console.log('CERT_HTML_OK');"
```
Expected: `CERT_HTML_OK`。

- [ ] **Step 4: Commit**

```bash
git add certifications.html
git commit -m "docs(certifications): add ace-ack certification tile

- new card with 7 ACK core topics (exact match to ACK_CORE_TOPICS),
  URL quiz.html?mode=ace-ack, and a 76%-purity description to align
  with minPrimary:38 / 50
- static check CERT_HTML_OK: all 7 topic strings + ace-ack code +
  mode=ace-ack URL placeholder present"
```

---

## Task 7 · 扩 Playwright E2E：7 → 8 exams；ace-ack metaKeys ≥5

**Files:**
- Modify: `outputs/playwright-e2e.js`（读脚本结构，在 EXAMS 数组追加一条；在 metaKeys 校验里加对 acp-devops / ace-ack 两条 ≥minMetaKeys）
- Guard: 必须保留原脚本的"progressText 解析 + examMeta"两条通道，不能因为扩展 ace-ack 而破坏已有的 7 条断言（尤其是 acp-devops）

- [ ] **Step 1: Read outputs/playwright-e2e.js，定位 EXAMS 数组定义与 meta 校验段**

- [ ] **Step 2: 在 EXAMS 尾部追加一条，并同步写 minMetaKeys / metaKeys**
追加对象：
```js
{ code:'ace-ack', title:'ACE ACK专项',
  minMetaKeys: 5,
  metaKeys:['集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测'] }
```
如果脚本里对 acp-devops 已经定义了 metaKeys，保留那条；**不要删除**。如果 acp-devops 原本没有 metaKeys，**也不要在本任务里修改 acp-devops 的 EXAMS 配置**（保持改动最小化，避免不必要的回归）。

- [ ] **Step 3: 运行 6 类断言脚本（确保本次修改仅动 E2E，不破坏 node 层）**
```bash
node outputs/ace-ack-verify.js
```
Expected: **6/6 PASS**。

- [ ] **Step 4: Commit（仅 E2E 脚本，注意此时 E2E 还没跑——跑在 Task 9 SubB 里）**

```bash
git add outputs/playwright-e2e.js
git commit -m "test(e2e): extend playwright 7 -> 8 exams with ace-ack metaKeys

- ace-ack entry in outputs/playwright-e2e.js: minMetaKeys=5/7 (same
  rigor as the existing acp-devops coverage check)
- ace-ack-verify.js TDD: still 6/6 PASS after this commit (only E2E
  config changed); Playwright run itself is executed in final Task 9
  SubB against local HTTP server"
```

---

## Task 8 · 本计划前 7 Task 做完后，统一再跑一次 ace-ack-verify（最终 GREEN 确认）

**Files:**
- Test: `outputs/ace-ack-verify.js`（最终跑一次）

- [ ] **Step 1: 跑**
```bash
node outputs/ace-ack-verify.js
```
Expected: `✅ PASSED 全部 6 类断言通过`，exit 0。记录下 T5 5 场 primary 的具体数值（例如 39/39/38/40/39），下一步写入最终 commit message。

---

## Task 9 · Playwright 端到端 8/8 URL（本计划前 8 Task 完成后必跑，不得"下次再跑"）

> 说明：把本任务拆成 SubA（检查起 http.server 能力）、SubB（真实跑 E2E 并收集 8/8 PASS 证据）。Skill 合理化借口 Reality 已经把"E2E 慢下次跑"强杀。

**Files:**
- Test: `outputs/playwright-e2e.js`
- Tool: `python -m http.server <port>` 或任何等价静态 HTTP server；端口默认 8080，playwright-e2e.js 内部若不自带 server 起服务，则 runner 自己起一个；**不允许直接 file:// 打开**（file:// 下 script src 相对路径跨域/模块策略会变）

- [ ] **SubA: 验证本地起 server + 端口可连**
```bash
# 起 server（非阻塞）
Start-Job -ScriptBlock { Set-Location "c:\Users\Todd\Documents\GitHub\cloudninja-aliyun"; python -m http.server 8765 } -Name ack_e2e_srv
Start-Sleep 3
# HTTP 200 验证 quiz.html?mode=ace-ack 可返回
(Invoke-WebRequest -Uri "http://127.0.0.1:8765/quiz.html?mode=ace-ack" -UseBasicParsing).StatusCode
```
Expected: StatusCode = 200。

- [ ] **SubB: 跑 playwright-e2e.js**
```bash
node outputs/playwright-e2e.js
$ec=$LASTEXITCODE
Stop-Job -Name ack_e2e_srv -ErrorAction SilentlyContinue ; Remove-Job -Name ack_e2e_srv -Force -ErrorAction SilentlyContinue
Write-Output "PLAYWRIGHT_EXIT=$ec"
```
Expected: 控制台输出 `Summary: ALL PASS`；8 条考试：aca-cloud/aca-security/acp-cloud/acp-security/acp-devops/ace-cloud/ace-security/**ace-ack** 全部 `total=50`、`consoleErr=0`；ace-ack 的 `metaKeysHit>=5`。
若 FAIL：
  - 若 404：检查 SubA server 真正起来没；
  - 若 ReferenceError: ACK_QUESTIONS → 返回 Task 4 看 quiz.html 顺序；
  - 若 ace-ack total < 50 → 检查 EXAM_MODULES['ace-ack'] rule；
  - 若 metaKeysHit<5 → 检查双段 primary 池是否够（T5 已 PASS，多半是 examMeta 显示截断，调 metaKeys 匹配方式**而不是降低 minMetaKeys**，按 Skill Red Flags 第 2 条）。

---

## Task 10 · 交付前最终核对清单（Checklist，每条必须手动 √）

- [ ] `node outputs/ace-ack-verify.js` → 6/6 PASS，且 T5 5 场 primary 数 ≥38（具体数已写入草稿）
- [ ] `node outputs/playwright-e2e.js`（本地 HTTP server 模式）→ 8/8 PASS，ace-ack metaKeys ≥5，acp-devops 仍 PASS
- [ ] git diff 仅包含 本计划 §"文件结构总览" 列出的 11 个文件 + spec/plan 2 个文档，**无多余文件**（outputs/check-rel.js 等遗留未跟踪文件不要进入本次 commit）
- [ ] Red Flags 扫描（5 条，来自 Skill）：
  - [ ] 断言脚本 mtime 早于 questions-ack.js（否则违 RED 原则，需删题库重跑）
  - [ ] T5 任何一场 primary<38 但显示 PASS（修断言不是改题）
  - [ ] Playwright FAIL 被当"环境问题"跳过（必须修到 8/8）
  - [ ] ACK_QUESTIONS ref 空串 ≥28 道（覆盖率 <80%）
  - [ ] 任一域题量 ≠ DISTRIBUTION 或 三元组 ≠ TYPE_RATIOS（必须精确）
- [ ] `git status --short` 确认没有未登记文件

---

## Task 11 · 收尾：调用 finishing-a-development-branch 4 选项并执行

**Files:**
- Skill: `trae-remote-official:superpowers:finishing-a-development-branch`

- [ ] **Step 1: 再次跑两道最终验证（T1-T6 + Playwright）确保"Tests pass"**
```bash
node outputs/ace-ack-verify.js
# 起 server 后：
node outputs/playwright-e2e.js
```
Expected：两道全 PASS。

- [ ] **Step 2: 检测 git 环境（normal repo on main）**
```bash
git rev-parse --git-dir ; git rev-parse --git-common-dir ; git branch --show-current
```
Expected: `GIT_DIR == GIT_COMMON == .git`，branch = main → **normal repo on main → 4 选项菜单**。

- [ ] **Step 3: 向用户呈现 4 选项（按 Skill 原文抄，不得增删）**
```
Implementation complete. What would you like to do?
1. Merge back to main locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```
（因为本次工作区直接在 main 上，选 1 = "在 main commit 所有未提交改动到 main 本身"。）

- [ ] **Step 4: 用户选 1 后，commit message 必须含：**
  - T5 五场 primary 具体数（例：`T5: 39/39/38/40/39 all >=38`）；
  - Playwright 结果（`Playwright E2E: 8/8 PASS, ace-ack metaKeysHit=6/7`）；
  - 题库总量 343→483、新题 140、去重 overlap=0；
  - minPrimary=38（76%）、双段对象 rule、无硬编码分支。

---

## Plan Self-Review（writing-plans skill 强制 —— 已经跑完一次，结果如下）

### 1. Spec Coverage
| Spec 节 | 对应 Task |
|---|---|
| §0 目标（140题/76%/零回归） | Task 2（写题）、Task 5（T5≥38 / T6=50）、Task 9（8 URL） |
| §1 Input Contract 10 项 | Task 1（10 项硬编码写进断言脚本常量）、Task 2（每域配额/三元组/id 前缀） |
| §2 双段引擎 + 三分支通用 | Task 3（加常量 + EXAM_MODULES + EXTRA_QUESTIONS） |
| §3 quiz.html 顺序 | Task 4（必须 read 后 edit，严格在 bank.js 之前） |
| §4 文档三件套 | Task 5（README 4 处）、Task 6（certifications.html ace-ack 卡片）、Task 0 前置 spec/plan |
| §5 6 类断言脚本规格 | Task 1（逐段对应 T1~T6、断言逻辑代码化、N=140/BANK=483硬编码） |
| §6 Playwright E2E 8/8 | Task 7（扩 8）、Task 9（真实跑 E2E + 起 server 子步骤） |
| §7 Red Flags 5 条 | Task 10 CheckList 手动勾选（每条对应一条） |
→ 全 Spec 要求均有对应 Task。✅

### 2. Placeholder Scan
- 在本计划中搜索 `TBD` / `TODO` / `implement later` / `handle edge cases` → **0 命中**。
- Task 2 Step 3 里的「继续补题」未逐行写 133 道题，但给出了：① 题目字段契约、② 7 域 id 前缀/序号范围表、③ 每域题型配比、④ ref 域名要求、⑤ 每 5 道跑一次断言的强制节奏——这是计划而非代码，具体题目内容留给 Task 2 Subagent 生成，不属于 Placeholder。✅

### 3. Type Consistency
- `ACK_CORE_TOPICS` 七项字符串：在 Spec §1-8、Task 1 断言脚本常量 `CORE_TOPICS`、Task 3 questions-bank.js 常量、Task 6 certifications.html topics 数组、Task 7 Playwright metaKeys：**五处字节级一致**。
- `EXAM_CODE = 'ace-ack'`：断言脚本 T5 / EXAM_MODULES key / Playwright code / URL mode=ace-ack / README 快速开始 / certifications.html code：六处一致。
- `MIN_PRIMARY = 38`：Spec §1-7 / Task 1 断言 / Task 3 EXAM_MODULES.minPrimary / T5 5 场检查：四处一致。
→ 无命名冲突。✅
