# ACP DevOps 题库扩充与考试过滤策略改造 · 设计稿

> 日期：2026-08-27
> 项目：cloudninja-aliyun（云忍者 · 阿里云认证模拟考试平台）
> 目标：将现有 203 道"云计算基础设施题"补齐 **140 道阿里云 DevOps 方向专属题**，同步改造 ACP DevOps 模拟考试的抽题过滤策略，确保每场 50 题中 DevOps 专属题纯度 ≥ 70%。
> 现状诊断：全库 0 道 DevOps 主题题；`acp-devops` 当前只会从 ["弹性伸缩","SLB","云计算通用","ECS"] 4 个云基础设施域里抽 83 题，与官方 ACP DevOps 考纲（云效、ACK、ACR、IaC、可观测、发布策略、微服务治理）几乎不匹配。

---

## 1. 整体方案选择（路径 1 · 经用户确认）

从 3 种候选路径中选择 **路径 1（单独立题库文件 + 细粒度 DevOps Topic）**：

| 路径 | 形态 | 结论 |
|---|---|---|
| 路径 1（采用） | 新文件 `acp-quiz/questions-devops.js` 承载全部 140 题；7 主域直接写进 `module` 字段；ACP DevOps 过滤策略改"双段优先" | ✅ 改动最小、职责清晰、后续扩充最顺 |
| 路径 2 | 拆为 7 个 `devops-*.js` 子文件 | ❌ `<script>` 引入链与 `EXTRA_QUESTIONS` 合并逻辑会膨胀到 7× 条，当前单作者没必要 |
| 路径 3 | 直接并入 `questions-extra.js`（杂项扩展题库） | ❌ 污染扩展题库本已"补缺杂项"的职责，二次导出 DevOps 题库不方便 |

**方案 1 的改动范围只有 5 处：**
1. ✨ 新增 `acp-quiz/questions-devops.js`（140 题新数据）
2. 🔧 `quiz.html`：多引入一行新题库 script
3. 🔧 `questions-bank.js`：`EXTRA_QUESTIONS` 合并、DevOps 双段过滤常量、`getQuestionsForExam()` 支持双段 rule
4. 📝 `README.md`：题库总量、题库说明表、项目结构图补一行
5. （可选）`certifications.html`：`acp-devops.topics` 文字微调，对齐 7 主域术语

---

## 2. 140 题分布与题型比例（按阿里云 ACP DevOps 考纲权重重现）

> 总计 **140 题**；ID 前缀与主域一一对应，不和现有 `ecs01~`、`oss01~`、`rds01~` 等前缀冲突。
> 题型目标比例（官方口径贴近）：单选 ~45%、多选 ~39%、判断 ~13%，允许每域实际值 ±2。

| 主域 `module` 值 | ID 前缀 | 题数 | 单 | 多 | 判 | 子主题清单 |
|---|---|---|---|---|---|---|
| 云效DevOps平台 | `yx01~22` | 22 | 10 | 9 | 3 | Codeup 分支 / MR / 保护规则 / Codeup 安全扫描；Flow 流水线（阶段、任务、缓存、镜像构建、质量门禁、自定义 Agent、变量）；Packages 制品库（Maven/NPM/PyPI）、制品扫描；效能洞察（DORA 指标、吞吐率、交付时长、变更失败率） |
| 容器服务ACK | `ack01~26` | 26 | 12 | 11 | 3 | 集群类型对比（Dedicated/Managed/Serverless-ASK/边缘）；节点 / 节点池 / 自动伸缩 / 污点容忍；Deployment / StatefulSet / DaemonSet / Job / CronJob；Service + Ingress + CLB/NLB 选择；PV/PVC + CSI（云盘/NAS/OSS）；网络 CNI（Flannel vs Terway ENI / Terway ENI-Trunking）；Helm Chart 安装升级回滚；命名空间 + ResourceQuota/LimitRange；常见故障（ImagePullBackOff / CrashLoopBackOff / Pending） |
| 容器镜像ACR | `acr01~16` | 16 | 7 | 7 | 2 | 实例类型（默认/基础版/企业版EE/托管版HELM）；命名空间访问控制 + 仓库 Tag 不可变；镜像漏洞 / 恶意文件 / 许可证 3 类扫描；跨地域 / 跨账号 / 跨实例镜像同步；Trigger 自动触发 ACK 部署；ACR EE P2P 加速；Helm Chart 托管仓库；OCI Artifacts 支持 |
| IaC与运维编排 | `iac01~22` | 22 | 10 | 10 | 2 | ROS 模板结构（Resources / Outputs / Parameters / Mappings / Conditions）；栈、变更集 Change Set、嵌套栈、漂移检测、删除保护、回滚策略；Terraform（HCL、Provider、State backend to OSS、Module、Workspace、Plan/Apply/Destroy、Lifecycle）；OOS 运维编排（模板、公共模板、自定义任务、审批节点、批量运维、定时运维、跨地域执行、命令输出、参数传递） |
| 可观测与监控 | `obs01~20` | 20 | 9 | 9 | 2 | SLS（Project / Logstore / Shard、全文索引 + 字段索引、查询语法、GetLog/GetHistogram/SQL 分析、告警、投递 OSS / MaxCompute、消费组、Logtail 采集）；ARMS（Java/Python/Node/Go 应用监控、浏览器前端监控、调用链 Trace、自定义监控）；Prometheus 监控（ACK 默认集成、Exporter、ServiceMonitor、Grafana 大盘）；云监控 EventBridge 联动；降噪（告警分组 / 抑制 / 静默） |
| 发布与部署策略 | `rel01~14` | 14 | 6 | 7 | 1 | 滚动 / 蓝绿 / 灰度（金丝雀） / A/B / 停机发布对比；ACK 原生 Deployment maxSurge / maxUnavailable；ACK Canary Release + ASM 权重切分 + Header 路由灰度；流水线发布质量门禁（SonarQube、OWASP Dependency Check、JUnit 覆盖率阈值、制品扫描）；一键回滚（镜像版本 + 配置版本）；流量镜像 / 影子流量；零停机发布的条件 |
| 微服务与服务治理 | `mse01~20` | 20 | 9 | 9 | 2 | MSE 注册配置中心（Nacos 2.x / ZooKeeper / Eureka 托管、命名空间、配置加密、配置灰度、数据模型）；MSE 云原生网关（Ingress 替代、路由 / JWT / 限流 / WAF / 跨域）；MSE 服务治理（标签路由、全链路灰度、泳道、限流熔断、离群摘除、热点参数限流）；ASM / Istio（VirtualService / DestinationRule / Gateway / Sidecar 注入、mTLS、流量镜像、故障注入）；南北向 vs 东西向；与 ARMS / SLS 可观测对接 |
| **合计** | — | **140** | **63** | **55** | **18** | |

### 2.1 数据结构（100% 对齐现有 questions-rds.js）
每条题对象字段：

```js
{
  id:            'yx03',                         // 按域前缀自增，全局唯一
  module:        '云效DevOps平台',                // 7 主域之一，会被 normalizeQ 直接保留为 topic
  type:          'single' | 'multi' | 'judge',   // 与 TYPE_MAP 一致
  question:      '<中文题干，一句问到底，必要时加括号给关键限定>',
  options:       ['选项 A','选项 B','选项 C','选项 D'],  // judge 固定写 ["正确","错误"]
  answer:        [0, 2],                         // 正确选项的索引数组；judge 通常是 [0] 或 [1]
  explanation:   '<详细解析，必须指出"对在哪、错在哪"，多选题对每个选项逐一解释>',
  ref:           'help.aliyun.com/zh/<产品>/user-guide/xxx'  // 阿里云官方文档链接，无 https:// 前缀（与现有题库一致）
}
```

> 归一化逻辑保持不变：`questions-bank.js` 中的 `normalizeQ()` 会读 `q.module → TOPIC_MAP[q.topic] → q.topic → '云计算通用'`。因为 DevOps 题直接把 7 个主域填进 `module`，所以会被完整保留为 topic，**不需要在 TOPIC_MAP 里加任何条目**。

---

## 3. ACP DevOps 抽题策略：从"单段过滤"升级为"双段优先"

### 3.1 变更前（已证不足）
```js
'acp-devops': ['弹性伸缩', '负载均衡SLB', '云计算通用', '云服务器ECS']   // 83/203 题，且无一题是 DevOps 核心域
```

### 3.2 变更后（推荐实现）
在 `questions-bank.js` 新增两个常量 + `EXAM_MODULES['acp-devops']` 改对象格式 + `getQuestionsForExam()` 识别对象 rule：

```js
// DevOps 7 大核心域（优先池）
const DEVOPS_CORE_TOPICS = [
  '云效DevOps平台', '容器服务ACK', '容器镜像ACR',
  'IaC与运维编排', '可观测与监控', '发布与部署策略', '微服务与服务治理'
];
// DevOps 兜底补齐池：仍沿用原 4 个云基础设施域，对应官方考纲 ~15% 的云计算基础比例
const DEVOPS_FILL_TOPICS = ['弹性伸缩', '负载均衡SLB', '云计算通用', '云服务器ECS'];

const EXAM_MODULES = {
  'aca-cloud':       null,
  'aca-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
  'acp-cloud':       null,
  'acp-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
  'acp-devops':      { primary: DEVOPS_CORE_TOPICS, fill: DEVOPS_FILL_TOPICS, minPrimary: 35 }, // ⭐️ 核心改动
  'ace-cloud':       null,
  'ace-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用']
};
```

`getQuestionsForExam(examCode, extraQuestions)` 扩展兼容：
1. 若 `EXAM_MODULES[examCode]` 是对象（非数组）→ 走双段路径：
   - `primaryPool = shuffle(all.filter(q ∈ rule.primary))`
   - `fillPool    = shuffle(all.filter(q ∈ rule.fill))`
   - 先取 `primaryPool.slice(0, min(rule.minPrimary, 50))`
   - 再用 `fillPool.slice(0, 50 - picked.length)` 补齐
   - 万一仍不足 50（极端 case，如未来题库变很小），从全库 dedupe 补
2. 数组 → 走现有单段过滤路径（其余 6 个考试方向不变）
3. null → 走全库 shuffle 路径（aca-cloud / acp-cloud / ace-cloud 不变）

**效果预测**：加完 140 题后，`primaryPool = 140`，`fillPool = 83`。每场 50 题中：
- 35/50 = 70% 严格来自 7 个 DevOps 主域
- 最多 15/50 = 30% 来自原云基础设施兜底
- 连续抽 4 场 35 题的 primary 子池不重复（140/35=4），用户感知无重复

### 3.3 其它考试方向的行为不变
所有其余 6 个 `EXAM_MODULES` 条目均是 `Array | null`，`getQuestionsForExam` 的 Array / null 分支一字未改，因此不会对 ACA / ACP Cloud / ACP Security / ACE 等模拟考产生行为差异。

---

## 4. 文件级改动清单（5 处，可直接映射到实施计划任务）

### 改动 A · 新增 `acp-quiz/questions-devops.js`
- 常量名：`const DEVOPS_QUESTIONS = [ ... ];`
- 140 题，id 前缀按 §2 表严格递增、零空号、零重复
- 多选每道 4 选项，judge 固定 2 选项，单选每道 4 选项
- 解释长度 ≥ 题干 1.2×，多选必逐项解释对 / 错，ref 指向阿里云具体产品文档
- 首行注释标明"2026 ACP DevOps 大纲补充题库 / 7 大域共 140 题"

### 改动 B · `quiz.html` 引入（第 108 行附近）
```html
<script src="acp-quiz/questions-data.js"></script>
<script src="acp-quiz/questions-rds.js"></script>
<script src="acp-quiz/questions-extra.js"></script>
<script src="acp-quiz/questions-devops.js"></script>   <!-- 新增 -->
<script src="questions-bank.js"></script>
```

### 改动 C · `questions-bank.js`（3 小项）
C1. `EXTRA_QUESTIONS` 合并追加 `DEVOPS_QUESTIONS` 分支  
C2. 新增 `DEVOPS_CORE_TOPICS` / `DEVOPS_FILL_TOPICS` 常量  
C3. 改 `EXAM_MODULES['acp-devops']` 为对象格式，并扩展 `getQuestionsForExam()` 兼容对象 + 数组 + null 三种 rule（向后兼容）

### 改动 D · `README.md`（3 小项）
D1. 顶部"**203 道**去重题库" → "**343 道**去重题库"，知识点补充 7 个 DevOps 主域名词。  
D2. 题库说明表格新增一行：
```
| `acp-quiz/questions-devops.js` | 140 | 云效 DevOps、容器服务 ACK、容器镜像 ACR、IaC(ROS/Terraform/OOS)、可观测 SLS/ARMS/Prometheus、发布策略(灰度/蓝绿/滚动)、微服务治理 MSE/ASM |
```
D3. 项目结构图中 `acp-quiz/` 下补 `questions-devops.js`（放在 questions-extra.js 之后即可）。  
D4. 快速开始 URL 表补 ACP DevOps 两行（练习 + 考试，若已有可跳过）。

### 改动 E · `certifications.html`（可选，不强依赖）
现有 `acp-devops.topics`（L706-L714）已覆盖大部分域，为保持术语一致可在末尾补两行 bullet：
- "容器与 Kubernetes：ACK 集群、网络 CNI、存储 CSI、工作负载与 Helm"
- "微服务治理：MSE 注册配置中心、服务治理标签路由、ASM/Istio 服务网格"

不做此改动**不影响功能**，只是文字更对齐；放在 spec 里供实施时作为"Nice-to-have"。

**不改动的文件**：app.js、style.css、exam-config.js、practice.html（acp-devops 卡已有）、game.html、about.html、contact.html、index.html。

---

## 5. 质量验收标准（写完 140 题 + 代码改造后的自检项）

**(5.1) 题目质量**
- [ ] 140 题在 `questions-devops.js` 中 JS 语法合法，浏览器 eval / `<script>` 引入无异常
- [ ] 7 主域题目数 = §2 表值（22/26/16/22/20/14/20），总 140，0 空号 0 重号
- [ ] 每域 `single / multi / judge` 比例等于 §2 表，允许实际值 ±1（因为多选偶尔要拆判断，最终总数不变即可）
- [ ] 全部 `answer` 索引有效：`answer ∈ [0, options.length-1]`，无越界；judge 永远只有 1 个索引
- [ ] 全部 `explanation` 中文通顺 ≥ 40 字，多选题**逐项**对 A/B/C/D 说"对在哪/错在哪"
- [ ] 全部 `ref` 格式统一为 `help.aliyun.com/zh/<产品>/<...>`（无协议、无 trailing slash，与现有题库一致）
- [ ] 题干查重：与现有 203 题按 `q.question.trim()` 比对，完全不同；且 140 题内部 0 重复（`dedue()` 后仍为 140）

**(5.2) 代码改造**
- [ ] 在空 console 环境运行 Node 脚本加载 4 个题库（data/rds/extra/devops + quiz.html 内联可选）→ 走 normalizeQ → dedupe → QUESTION_BANK **= 343 题**（203 + 140，若 quiz.html 内联重复仍允许 343，但不应低于 343）
- [ ] 调用 `getQuestionsForExam('acp-devops')` 5 次：每次返回 50 题数组；统计 primary 域题数 ≥ 35 每场
- [ ] 调用 `getQuestionsForExam('acp-cloud')` / `getQuestionsForExam('aca-security')` 各 1 次：行为与改造前等价（仍能返回 50 题，数组 / null 分支生效）
- [ ] 在 Chrome DevTools 开 `quiz.html?exam=acp-devops&mode=practice`：50 题能按单题切、选项可点、解析能显示 → 无 JS 报错
- [ ] practice.html 中 ACP DevOps 卡点击两条链接，URL 参数正确无误

**(5.3) 文档**
- [ ] README 顶部题库总量 = 343；题库说明表有 questions-devops.js 一行；项目结构图含新文件；ACP DevOps 快速开始链接存在。

---

## 6. 7 大域样例题（质量锚点）

> 以下 7 题代表生成 140 题时统一采用的**难度、语气、选项质量、解析结构、ref 长度**标准。实际写入题库文件时会原样收录这 7 题。

### 6.1 云效DevOps平台 · 多选（yx03）
- **题干**：关于阿里云云效 Codeup 的代码库保护规则，以下哪些是官方默认支持且推荐用于主干保护的能力？
- **选项**：A. Push 限制（仅允许特定成员或通过合并请求合入）B. 合并请求（MR）必须至少通过 N 个评审人审批 C. 合并前必须通过 CI 流水线构建与代码质量门禁 D. 合并前必须在本地执行一次代码格式化提交
- **answer**：`[0,1,2]`
- **解析**：Codeup 主干保护支持 Push 限制、MR 审批人数量门槛、CI 检查门禁（必须通过流水线任务才能合并）三大基础能力，A/B/C 正确。D 所述"本地必须执行格式化再提交"是团队约定，Codeup 可以通过流水线阶段强制检查格式化产物，但并非平台内建的"保护规则"开关。
- **ref**：`help.aliyun.com/zh/codeup/user-guide/protect-a-branch/`

### 6.2 容器服务ACK · 单选（ack05）
- **题干**：阿里云 ACK 集群中，以下哪种网络插件支持 Pod 直接使用弹性网卡 ENI、Pod IP 与 VPC 处于同一扁平网络平面、可被 VPC 内其他服务直接三层路由？
- **选项**：A. Flannel B. Terway（ENI 多 IP 模式）C. Calico BGP D. Kube-router
- **answer**：`[1]`
- **解析**：Terway 是阿里云自研 CNI，在 ENI 多 IP / ENI 直通模式下 Pod 直接挂载弹性网卡辅助 IP，Pod IP 属于 VPC CIDR，可被 VPC 三层路由。Flannel 走 VxLAN Overlay，Pod IP 为虚拟 CIDR，默认不能被 VPC 对等三层互通。C/D 不是阿里云 ACK 默认官方提供的网络插件。
- **ref**：`help.aliyun.com/zh/ack/product-overview/terway-overview`

### 6.3 容器镜像ACR · 判断（acr06）
- **题干**：阿里云容器镜像服务 ACR 企业版（EE）支持跨地域实例间的镜像自动同步，并且可以配置触发规则（例如每次向主实例推送指定仓库镜像后自动同步到灾备实例）。
- **选项**：`["正确","错误"]`
- **answer**：`[0]`
- **解析**：ACR 企业版提供"同步实例"功能，支持在命名空间级别配置源 / 目标实例对、并可与仓库 Trigger 联动；支持跨地域、跨账号、跨实例同步，可用于异地灾备与就近拉取场景。
- **ref**：`help.aliyun.com/zh/acr/user-guide/synchronize-images-between-instances/`

### 6.4 IaC与运维编排 · 多选（iac11）
- **题干**：关于阿里云 ROS（资源编排服务）与 Terraform（阿里云 Provider）的使用对比，以下说法正确的有？
- **选项**：A. ROS 模板原生支持 JSON / YAML，Terraform 采用 HCL 语言 B. 两者都支持"变更预演"（ROS 变更集 Change Set / Terraform Plan）再执行 C. Terraform 的 State 必须存储在本地磁盘，ROS 不需要维护 State D. 两者都支持通过嵌套栈 / Module 对模板进行模块化复用
- **answer**：`[0,1,3]`
- **解析**：A 正确，模板格式如上；B 正确，ROS 变更集与 `terraform plan` 都是先展示要 Create/Update/Delete 的资源再落盘执行；C 错误：Terraform State 官方推荐远程 backend（阿里云 OSS / Terraform Cloud / Consul 等），避免本地锁冲突与丢失；D 正确，ROS 嵌套栈 + Terraform Module 都是常用的复用手段。
- **ref**：`help.aliyun.com/zh/ros/` + `registry.terraform.io/providers/aliyun/alicloud/latest`

### 6.5 可观测与监控 · 单选（obs07）
- **题干**：阿里云 SLS 日志服务中，要对一个 Logstore 的日志做**全文关键词检索 + SQL 字段聚合分析**，必须先在控制台开启以下哪项配置？
- **选项**：A. 日志分区（Shard）自动分裂 B. 索引（全文索引 + 字段索引）C. 开通日志投递到 OSS D. 开启消费组（Consumer Group）
- **answer**：`[1]`
- **解析**：SLS 的查询分析功能完全依赖索引：全文索引决定哪些关键词可以被检索，字段索引（标注字段类型 long/double/text/json）决定 SQL 能否按列 `SELECT / GROUP BY / AGG`。Shard 自动分裂是吞吐扩展、投递 OSS 是离线归档、消费组是实时流式消费，三者都不影响"查询/SQL"能力。
- **ref**：`help.aliyun.com/zh/sls/user-guide/configure-index`

### 6.6 发布与部署策略 · 多选（rel08）
- **题干**：关于"灰度发布（金丝雀）"和"蓝绿发布"的对比，下列说法正确的是？
- **选项**：A. 蓝绿发布需要同时维护两套容量对等的环境，切换时流量整体 0%→100% 切到新环境 B. 灰度发布是按比例逐步放量（如 5%→20%→50%→100%），可在中间阶段观察监控指标后再决定继续或回滚 C. 灰度发布和蓝绿发布都可以做到"零停机发布" D. 两种策略都必须依赖 Service Mesh（如 ASM/Istio）才能实现
- **answer**：`[0,1,2]`
- **解析**：A/B 是两策略的教科书级区别，均正确；C 正确，因为蓝绿切换是原子切换，灰度过程中新版本并行运行，两种用户侧都无停机；D 错误：蓝绿可以只靠 SLB 权重 / DNS 切流量实现，灰度可以靠 ACK 原生 Deployment 的 canary 控制器或 Nginx Ingress 注解切权重实现，Service Mesh 提供的是更细粒度的 Header / Cookie / 用户维度路由，不是必要条件。
- **ref**：`help.aliyun.com/zh/ack/best-practices/use-ingresses-to-implement-gray-release`

### 6.7 微服务与服务治理 · 单选（mse04）
- **题干**：阿里云微服务引擎 MSE 中，以下哪一组件提供了开箱即用的 Nacos 注册中心 + 配置中心托管能力，支持命名空间隔离、配置加密、配置版本回溯、配置灰度推送？
- **选项**：A. MSE 云原生网关 B. MSE 注册配置中心（Nacos 托管版）C. MSE 服务治理（标签路由、全链路灰度、流量防护）D. MSE ZooKeeper 独享版
- **answer**：`[1]`
- **解析**：MSE 注册配置中心提供 Nacos（同时支持 Eureka / ZooKeeper 协议兼容）托管版实例，直接对应题干能力。A 是南北向七层网关；C 是叠加在应用接入之上的治理能力（与注册中心解耦）；D 只有 ZooKeeper，不含 Nacos。
- **ref**：`help.aliyun.com/zh/mse/product-overview/what-is-mse`

---

## 7. 范围边界（YAGNI / 不在本次实施的事项）

- ❌ 不改写现有 203 道题的文本、分类、题型、解释（除非发现 answer 索引越界等真实 bug，否则不动）
- ❌ 不引入任何新 npm 依赖、不引入构建工具（保持零框架纯前端）
- ❌ 不增加"按子域练习"的 UI 入口（如需，放后续迭代 spec；本 spec 的 topic 粒度已经为它预留好字段基础）
- ❌ 不做新的认证方向注册（如 ACP 云原生容器 / ACE DevOps），这些已有的 certifications.html 条目保持原样
- ❌ 不实现 Node 端的"覆盖率报告"生成脚本（outputs/acp-coverage-report.html 已存在，本 spec 对其是否更新不作强制；若更新另立 task）
- ❌ 不做用户登录 / 进度云端存储 / 错题本等平台性功能

---

## 8. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 140 题写完后因 JS 语法错误导致 `<script>` 加载中断，所有题都读不到 | 低 | 阻塞整个答题系统 | 写完 140 题必须在 Node 端 `loadConstArr()` 成功解析 140 条；并手动在浏览器打开 quiz.html 验证一次 |
| 新题与现有 203 题出现撞题干（重复） | 中 | 去重后不足 343、ACP DevOps 可选池变小 | 实施阶段最后执行去重校验脚本，若去重后 < 340 则对撞题干的 DevOps 题补新题替换 |
| 7 主域的 `module` 字符串有拼写偏差，归一化后落到"云计算通用"兜底 | 低 | DevOps 题未进入 primary 池，纯度达不到 70% | 写完后跑统计脚本：按 `q.topic` 分组，要求 7 主域每域题数 ≥ §2 表最低值；否则 grep 修拼写 |
| `getQuestionsForExam` 双段逻辑写死了 `acp-devops`，破坏未来扩展 | 低 | 后续想加 "双段过滤"的新考试需要再改 | 本次把双段逻辑实现为"只要 rule 是对象就走双段"，非写死，保持通用 |
| 样例题与真题风格差异过大，导致 140 题质量不一致 | 中 | 用户体验差、备考效果打折扣 | §6 样例 7 题全部收录到题库文件正文，后续其余题以它们为模板逐题对照 |
