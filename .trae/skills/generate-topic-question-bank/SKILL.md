---
name: "generate-topic-question-bank"
description: "生成知识域定向题库并接入既有试卷抽题引擎，同步产出可跑的6类断言验收脚本。调用时机：用户要求为某一新考试方向（如『ACE DevOps』『容器服务专项』）新增N道题、要求抽题纯度≥X%。"
---

# generate-topic-question-bank

> Skill TDD 基线（RED）：无此 skill 时 agent 在"扩考试方向题库"任务中反复出现以下三类失败——
> 1) **先写题后写验**：产出 X 道题后才想到去重/格式校验，导致一次性返工 30% 以上；
> 2) **不做双段抽题策略**：把新域题直接塞进大数组，让"按 module 随机取题"自行稀释到 40%-60%，永远达不到用户明示的"≥70% 该方向题"；
> 3) **只验证 node 不验证真实 SPA**：控制台通过了，就宣称"可交付"，结果 quiz.html 漏了 `<script>` 引入，Playwright 首屏就是 `ReferenceError: XXX_QUESTIONS is not defined`。
>
> 本 skill 就是针对这三条失败路径的「反模式清单 + 可执行步骤」。

## Overview

一次完整的"加考试方向 + 批量出题"任务，按 **Spec → Plan → TDD 6 类断言先跑 RED → 写题跑 GREEN → 双段 primary/fill 改 engine → quiz.html + docs → Playwright 7 方向 E2E → 收尾** 的顺序推进。原则：**验收脚本永远比题目第一个文件先存在**。

## When to Use

触发条件（命中任一即加载）：
- 用户说「XX 方向题目太少」「加一个 ACP/ACE 某某新考试」「题库补某知识域 N 道题」
- 用户要求"抽考时该方向题目必须占到 ≥X%"或等价表述
- 现有 `questions-bank.js` / `quiz.html` 要新增 `<script src="questions-xxx.js">`

**不要**用于：
- 改单题文案 / 改答案 / 改解析（直接 edit 即可）
- 与题库抽题引擎无关的文档或通用前端页面任务

## Input Contract（用户给出时立即抄下来，不要让细节散落）

| 输入项 | 示例 | 必须？ |
|---|---|---|
| 新题库 JS 文件名 | `questions-devops.js` | ✅ |
| 全局常量名 | `DEVOPS_QUESTIONS` | ✅ |
| 考试 code（EXAM_MODULES key） | `acp-devops` | ✅ |
| 总量 N | `140` | ✅ |
| 知识域→题量分配（且求和=N） | `yx22/ack26/acr16/iac22/obs20/rel14/mse20` | ✅ |
| 每域 单/多/判 比例（和=域题量） | `10/9/3, 12/11/3, …`（3 元组） | ✅ |
| 最低 primary 纯度（按 50 题卷） | `≥35 primary ⇒ minPrimary:35` | ✅ |
| primary / fill 知识域白名单 | `primary=7 DevOps 域; fill=通用/ECS/VPC/RDS…` | ✅ |
| 字段契约 | `id,module,type,question,options[],answer[],explanation,ref` | ✅ |

**常见合理化借口 & 反制**：

| 借口（agent 原话） | Reality | 反制动作 |
|---|---|---|
| "先各写 2 道跑起来，后面再补到 140" | 2 题的去重/分布断言永远为 true，RED 形同虚设，最后一定欠账 | 先写验收脚本 `T1.总量=N`；在总量断言写死后再让 agent 去补题 |
| "比例只是设计参考，差 1-2 题无所谓" | 3 元组不闭合 → 域题量≠N → EXAM_MODULES primary pool 会被提前耗尽 | 断言脚本必须显式检查「每域 sum(单/多/判) === 域题量」 |
| "答案索引越界就运行时再发现" | 多选题 answer[] 出界是最常见线上 silent-fail：Quiz UI 变成"全√却判错" | 断言脚本 T3 必须逐题 `0<=ans[i]<options.length` |

## Step-by-Step Playbook

### Step 1 · 生成 Spec（若还没有）
走 `brainstorming` → `writing-plans` 产出两份：
- `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`：上面 Input Contract 10 项逐项写死
- `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`：≥10 tasks，含 TDD + E2E 独立 task

### Step 2 · 先写 6 类断言脚本（TDD RED）
文件放 `outputs/<exam>-verify.js`。**必须在第一个 question 文件创建前落盘并执行（预期 RED FAIL）**。脚本结构固定：

```js
// T1 基础计数：新库长度 === N；合并 EXTRA_QUESTIONS 后的 BANK 总数 = 旧库 + N - overlap
// T2 域分布：7 域各自题量精确命中配额；每域 单/多/判 元组 sum===域题量
// T3 字段/索引/格式：
//     - 必要字段齐全 (id/module/type/question/options/answer/explanation/ref)
//     - type ∈ {single,multi,judge}；judge 的 options 长度必须=2 且文案含"正确|错误"
//     - multi: answer sorted, 所有元素 0<=idx<options.length
//     - single/judge: answer.length===1
//     - explanation 对 multi 必须按 A./B./C./D. 展开（对齐 options 顺序）
//     - ref 可空但非空必须是 help.aliyun.com 或等可信域名（非外链随便写）
// T4 去重：
//     - 新库内部 id 唯一性；normalized(question+options.join('|')) 唯一性
//     - 新库 vs 旧库 normalized 去重 === 0（或记录 overlap<阈值并获用户批准）
// T5 双段抽题：连跑 5 次 getQuestionsForExam('acp-devops', 50)，
//     每次 primary 题数 >= minPrimary；每场都必须抽到 50 题（不能少）
// T6 回归：其余 6 个考试 code 各自抽 1 场，题数必须全为 50；
//     且不允许抛异常（禁止新 rule 分支让老 code 走入未定义路径）
```

跑一次 `node outputs/<exam>-verify.js`。必须看到 **T1 FAIL（题库文件未创建）**。这才是合格的 RED。

### Step 3 · 写 `acp-quiz/questions-xxx.js`（GREEN）
严格遵守 `Input Contract` 的比例和字段契约。写完即反复 `node outputs/<exam>-verify.js` 直到 6/6 PASS。**不允许先 commit 题目再补题**。

### Step 4 · 接入抽题引擎双段策略（questions-bank.js）
**不要**用 `"acp-devops": [topics…]`（单段随机，无法保证纯度）。改成对象 rule：

```js
EXAM_MODULES['acp-devops'] = {
  primary:  DEVOPS_CORE_TOPICS,   // 白名单数组
  fill:     DEVOPS_FILL_TOPICS,   // 不足时的补充池
  minPrimary: 35
};
```

`getQuestionsForExam()` 必须走**通用三分支**（不要为单个 exam 写死 if，未来 skill 复用时再改会漏）：
- `rule === null` → 全库随机
- `Array.isArray(rule)` → 单段按 module 白名单
- `typeof rule === 'object' && rule.primary` → 双段：先 primary，再 fill 补齐到 `count`；**断言 `primaryPicked.length >= rule.minPrimary`**，否则抛错（让 pool 不足问题在 T5 立刻暴露）

### Step 5 · 引入脚本 + 文档三件套
- `quiz.html`：在 `questions-bank.js` **之前**插入 `<script src="acp-quiz/questions-xxx.js">`（先于 bank 才能保证常量存在）
- `README.md`：题库总量数字 / 项目结构树 / 快速开始表三处同步更新
- `certifications.html`：对应考试 code 的 `topics` 数组追加新域（用于首页展示知识域覆盖面）

### Step 6 · Playwright 7 方向 E2E（必选项，不允许跳过）
在 `outputs/playwright-e2e.js`（SPA v2 检测方案）里跑 7 个考试 URL，断言：
- `progressText` 解析出的总数 `=== 50`
- `console.error` 次数 `=== 0`（尤其是 `ReferenceError`）
- `examMeta` 文本中对 `acp-devops` 必须出现 ≥5 个 primary 域关键词（证明双段真的生效，不是全走 fill）

**合理化借口强杀**：
| 借口 | Reality |
|---|---|
| "本地 node 都过了，浏览器肯定没事" | quiz.html 顺序错就是 ReferenceError，node 单测看不到 DOM 脚本加载顺序 |
| "E2E 慢，下次再跑" | 一次跑 7 URL < 2min；但线上错了需要用户自己修复，更慢 |

### Step 7 · 收尾走 `finishing-a-development-branch`
- 必须 6/6 断言 + 7/7 Playwright 全过后才出现 4 选项
- 选项 1（在 main）执行顺序：`git add` → `git commit`（commit message 必须含 T5 纯度数据 + E2E 结果）→ `git push -u` 仅当远端可用时

## Quick Reference

```
1. Input Contract 10 项写死
2. outputs/<exam>-verify.js — 6 类断言写好并跑 RED FAIL
3. acp-quiz/questions-xxx.js — 跑 GREEN (6/6 PASS)
4. questions-bank.js — EXAM_MODULES 升级为 {primary,fill,minPrimary}，getQuestionsForExam 三分支通用
5. quiz.html <script> 插入 · README 203→N · certifications.html topics
6. Playwright E2E 7×PASS（含 examMeta 域关键字检查）
7. finishing-a-development-branch → 选项 1 commit + (push)
```

## Red Flags（出现任一，立即回滚本步）

- [ ] 验收脚本创建时间晚于第一个 question 文件 → 违 RED 原则，**删题库重跑**
- [ ] T5 某场 primary < minPrimary 却显示 PASS → 断言脚本写错了，**修断言不是改题**
- [ ] Playwright 报告 404 / ReferenceError 但被解释为"本机环境" → 必须修到 7/7 才能交付
- [ ] 题库 `ref` 字段全部为空或全是同一条链接 → 视为敷衍，**随机抽查 20 题要求 ref 与解析匹配**
- [ ] 域题量分布和 ≠ N，但被以"总题量达到就行"带过 → **退回 Step 3 重新按 Input Contract 比例重分布**
