# ACE ACK（容器服务ACK专项）140 题题库设计稿

> **批准状态**：2026-08-27 用户口头批准，按 generate-topic-question-bank Skill 执行。
> **对应 Plan 文件**：`docs/superpowers/plans/2026-08-27-ace-ack-question-bank.md`

---

## 0. 目标（一句话）
为现有 Quiz 项目新增「阿里云 ACE 级 容器服务ACK 专项」考试方向（code = `ace-ack`），**新增 140 道不重复的 ACE 水准 ACK 题目**，在每次抽 50 题的模拟卷中保证 ≥38 题来自 7 大 ACK 核心知识域（纯度 ≥76%），同时不影响既有 7 个考试方向（aca-cloud / aca-security / acp-cloud / acp-security / acp-devops / ace-cloud / ace-security）的抽题行为。

---

## 1. Input Contract（10 项锁定，严禁随意改）

| # | 输入项 | 最终值 |
|---|---|---|
| 1 | 新题库 JS 文件名 | `acp-quiz/questions-ack.js` |
| 2 | 全局常量名 | `ACK_QUESTIONS`（`const ACK_QUESTIONS = [ … ];`，挂在 `window`） |
| 3 | 考试 code（EXAM_MODULES key） | `ace-ack` |
| 4 | 总量 N | **140** |
| 5 | 知识域→题量分配（7 域，和=140） | life集群生命周期=20 · net网络与Ingress=22 · store存储=20 · workload工作负载=22 · hpa可靠性与弹性伸缩=18 · sec安全与治理=18 · ops运维与可观测=20 |
| 6 | 每域 单/多/判 三元组（和=域题量；总：单75+多44+判21=140） | life=11/6/3 · net=12/7/3 · store=11/6/3 · workload=12/7/3 · hpa=9/6/3 · sec=9/6/3 · ops=11/6/3（**每域判断题 = 3，保证 ≥2**） |
| 7 | 最低 primary 纯度（按 50 题卷） | `minPrimary: 38`（38/50 = **76%**） |
| 8 | primary 白名单（7 个 core 域名，同时是题目的 `module` 字段值） | `ACK_CORE_TOPICS = ['集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测']`（严格与题库中题目 module 一致） |
| 8b | fill 白名单（不足时的补充池） | `ACK_FILL_TOPICS = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS','专有网络VPC','云数据库RDS','容器服务ACK','云效DevOps平台']`（复用通用云基础设施池，保证 pool 足够大 ≥ 12 题） |
| 9 | 字段契约（与 acp-devops 完全一致，保证 normalizeQ / Quiz 引擎零改造） | `{ id, module, type, question, options[], answer[], explanation, ref }` |
| 10 | id 前缀 & 去重规则 | id 前缀 `aceack_<域缩写><2位序号>`，域缩写：life/net/store/work/hpa/sec/ops（如 `aceack_net01`）；与现有 343 题 id **完全不重叠**；question+options 归一化（strip 空白/标点/大小写）后与旧库 **0 重叠** |

### 字段契约细则（T3 断言依据，必须严格执行）

| 字段 | 规则 |
|---|---|
| `id` | 字符串，唯一，前缀如上；数字左补 0 |
| `module` | **必须**是 ACK_CORE_TOPICS 7 个字符串之一（映射到 normalizeQ.topic） |
| `type` | `single` / `multi` / `judge` 三者之一（原始值，非中文） |
| `question` | 中文题干，末尾带 `？` 或 `。`；不得出现 A/B/C/D 选项字母 |
| `options[]` | single/multi：4 项，长度=4，**每项是独立文本，不带前缀 A./B./C./D.**；judge：**2 项，固定 `['正确','错误']`** |
| `answer[]` | 0-based 索引数组；single/judge 长度=1；multi 长度=2~4，**升序排序**（便于对比）；所有元素：`0 ≤ ans < options.length` |
| `explanation` | 中文解析；**对 `type=multi`，必须按 A./B./C./D. 顺序逐项说明**（与 options 一一对应）；允许简短但不能是空串 |
| `ref` | 可空（空串允许），非空则必须是 `help.aliyun.com/...` 开头的官方文档 URL（可无 https:// 前缀，断言宽松匹配域名） |

---

## 2. 抽题引擎改造方案（与已有的 acp-devops 对象 rule 同构，复用 getQuestionsForExam）

### 2.1 EXAM_MODULES 新条目（新增，不改已有条目）
```js
EXAM_MODULES['ace-ack'] = {
  primary:    ACK_CORE_TOPICS,
  fill:       ACK_FILL_TOPICS,
  minPrimary: 38
};
```

### 2.2 EXTRA_QUESTIONS 合并（新增一个 concat 分支，不删现有）
```js
const EXTRA_QUESTIONS = []
    .concat((typeof RDS_QUESTIONS         !== 'undefined') ? RDS_QUESTIONS         : [])
    .concat((typeof EXTRA_TOPIC_QUESTIONS !== 'undefined') ? EXTRA_TOPIC_QUESTIONS : [])
    .concat((typeof DEVOPS_QUESTIONS      !== 'undefined') ? DEVOPS_QUESTIONS      : [])
    .concat((typeof ACK_QUESTIONS         !== 'undefined') ? ACK_QUESTIONS         : []); // ← 新增
```

### 2.3 getQuestionsForExam 分支
**不需要改**。`questions-bank.js:89` 处已实现「对象 rule 双段」的**通用三分支**（null / Array / object），`ace-ack` 使用对象 rule 直接复用即可。**禁止**为 `ace-ack` 写单独 if 分支，防止未来改引擎时双份逻辑不同步。

### 2.4 语义
当调用 `getQuestionsForExam('ace-ack', 50)`：
1. 先从 primary 池（7 ACK 核心域）中随机抽尽量多的题，保证 primaryPicked ≥ 38；如果 primary 池总数不足 38，**立即抛错**（让 T5 断言捕获）；
2. 剩余 12~ 题从 fill 池中随机抽取补齐；
3. 最终用全局 dedupe 再去重一次；若因去重导致结果 <50，断言 T5 报错。

---

## 3. quiz.html 改动
在 `acp-quiz/questions-devops.js` 引入后、`questions-bank.js` 之前，插入：
```html
<script src="acp-quiz/questions-ack.js"></script>
```
**顺序保证**（从已有 quiz.html 第 106~109 行延续）：
- `questions-data.js` → `questions-rds.js` → `questions-extra-topics.js` → `acp-quiz/questions-devops.js` → **`acp-quiz/questions-ack.js`** → `questions-bank.js`

若顺序错，运行 `questions-bank.js` 时 `ACK_QUESTIONS is not defined` → `EXTRA_QUESTIONS` 会空 → T1 断言 bank≠483 必 FAIL，Playwright E2E 也会有 console error。

---

## 4. 文档三件套改动

### 4.1 README.md（4 处更新，与上次 ACP DevOps 手法一致）
1. 顶部题库总数：**"目前题库包含 343 道精选题" → "483 道精选题"**；
2. 项目结构树中 `acp-quiz/` 下补 `questions-ack.js` 行；
3. "题库分布 / 考试方向" 表格补一行 `ace-ack | 阿里云ACE级·容器服务ACK专项 | 76% ACK核心域 | ace-ack 快速开始 URL`；
4. "快速开始"URL 表补一行 `ACE 容器服务ACK专项 | quiz.html?mode=ace-ack`。

### 4.2 certifications.html
- 若 `certifications.html` 中目前只到 `ace-security`，**新增一条完整的 ace-ack 条目**（与现有 acp-devops 条目卡片风格一致：标题 "ACE 容器服务ACK 专项认证（推荐路径）"、topics 数组=7 个 ACK core 域名、描述写 ACK 专家级方向、定位"云原生基础设施专家"、url 同样指向 `quiz.html?mode=ace-ack`）。
- 若 certifications.html 已有 ace-ack 空壳但 topics 不足 7，则直接在其 topics 数组追加到 7。

### 4.3 docs/superpowers/ 文档
- Spec（本文件）：`docs/superpowers/specs/2026-08-27-ace-ack-question-bank-design.md`
- Plan：`docs/superpowers/plans/2026-08-27-ace-ack-question-bank.md`（writing-plans skill 下一步产出）

---

## 5. 6 类断言脚本规格（T1~T6，**先于题目文件落盘并跑 RED FAIL**）

文件路径：`outputs/ace-ack-verify.js`。结构与 outputs/acp-devops-verify.js 相同，但：
- `EXAM='ace-ack'`，`BANK_FILE='questions-bank.js'`，`NEW_QUESTIONS_NAME='ACK_QUESTIONS'`，`NEW_FILE='acp-quiz/questions-ack.js'`
- `N=140`，`BANK_AFTER_DEDUP=483`（343+140）
- `EXPECTED_DISTRIBUTION` 对象按 §1-5 写 7 域配额；`EXPECTED_TYPE_RATIOS` 按 §1-6 写每域三元组（7×3=21 个数）
- `EXPECTED_CORE = ACK_CORE_TOPICS`（7 个）；`minPrimary = 38`；
- **T5 连抽 5 场** `getQuestionsForExam('ace-ack', 50)`，每场 primary 计数 ≥38 且最终长度=50；
- **T6 回归**：其余 7 个 exam code（aca-cloud/aca-security/acp-cloud/acp-security/acp-devops/ace-cloud/ace-security）各抽 1 场必须全=50 题，**连 acp-devops 的 primary 也仍要 ≥35**（证明改 EXTRA_QUESTIONS / EXAM_MODULES 不会破坏已有对象 rule）。
- **T4 去重新增检查**：对 ACK_QUESTIONS 的 question 与已有 343 题（DEV+RDS+EXTRA+旧 questions-data.js）做 normalized 去重，必须=0；若>0 必须列出具体 question 文本并 FAIL。
- **必须**以 `console.log('✅ PASSED 全部 6 类断言通过')` 结尾；任一断言失败立即 `process.exit(1)`。

**RED 验证要求**：第一次跑 `node outputs/ace-ack-verify.js` 时，`questions-ack.js` 尚未创建，T1 应当 FAIL（`ACK_QUESTIONS is not defined` 或 `Cannot read property 'length' of undefined`）。若显示 PASS，则断言脚本有 bug，必须立即修改。

---

## 6. Playwright E2E 改动规格（Skill 要求必选，不得跳过）

文件：`outputs/playwright-e2e.js`（SPA v2，上次已验证 progressText + examMeta）。

改动：
1. `EXAMS` 数组从 7 条扩到 8 条，新增 `{code:'ace-ack', minMetaKeys:5, metaKeys:['集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测']}`；
2. 对每个 exam：断言 `totalFromProgress === 50 && consoleErr === 0`，并且当配置了 `metaKeys` 时，examMeta 文本里命中的 meta key 数量 **≥ minMetaKeys**（对 ace-ack 要求 ≥5 / 7）；
3. 保留对 acp-devops 的已有 ≥5 命中断言（防回归）。

**执行方法**：在项目根 `python -m http.server 8080`（Playwright 脚本自己会起 server）→ 跑 `node outputs/playwright-e2e.js` → 8/8 PASS。

---

## 7. 交付与不可违背红线

按 `generate-topic-question-bank` Skill Red Flags，出现任一必须回滚：
- 验收脚本创建时间晚于 questions-ack.js 第一个字节写入
- T5 连抽 5 场中任一场 primary 计数 <38，但显示 PASS
- Playwright ace-ack 行显示 FAIL 却被解释为"环境问题"
- 140 道题中有 ≥10 道题 `ref=''` 全部为空（视为敷衍）
- 7 域题量或三元组和任一项对不上，被"先交了再说"带过
- 6 类断言 + Playwright E2E 8/8 有任何一项 FAIL，**不得进入 finishing-a-development-branch 选项流程**
