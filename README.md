# 云忍者 CloudNinja — 阿里云认证模拟考试平台

免费开源的阿里云认证在线备考平台，覆盖 **ACA / ACP / ACE** 三级认证体系，提供模拟考试、在线答题、认证指南与学习游戏。

## ✨ 功能特性

### 模拟考试系统
- **8 个认证方向**：ACA（云计算 / 云安全）、ACP（云计算 / 云安全 / DevOps）、ACE（云计算 / 云安全 / 容器服务 ACK 专项）
- **两种答题模式**：
  - **练习模式**：即时反馈，每题提交后显示正确答案与详细解析
  - **考试模式**：计时答题，统一批改，成绩单可视化（ACA 60 分钟 / ACP 120 分钟 / ACE 180 分钟）
- **483 道去重题库**：覆盖 ECS、OSS、VPC、RDS、PolarDB、NAS、SLB、安全组、弹性伸缩、RAM、NAT 网关、云监控、CDN、成本优化、Web安全，及 ACP DevOps 7 大域、ACE ACK 7 大域核心知识点

| 专项 | 题数 | 说明 |
|------|------|------|
| 新增 ACP DevOps | 140 题 | 云效平台 / 容器服务 ACK / 容器镜像 ACR / IaC / 可观测 / 发布部署策略 / 微服务治理 |
| 新增 ACE ACK 容器服务专项 | 140 题 | 双段过滤保证纯度 ≥76%（38/50） |
- **三种题型**：单选题、多选题、判断题

### 主题切换
- 暗色主题（默认）与亮色主题自由切换
- 主题偏好自动保存，跨页面持久化

### 其他页面
- **首页**：平台介绍、每日一题、认证路径推荐
- **认证指南**：ACA / ACP / ACE 各认证的详细信息、知识域分布、考试大纲
- **学习游戏**：Canvas 小游戏，学习间隙放松
- **关于 / 联系**：项目介绍与联系方式

## 🛠 技术栈

- 纯前端实现：HTML + CSS + JavaScript（无框架依赖）
- CSS 自定义属性（CSS Variables）实现主题系统
- 响应式设计，支持桌面与移动端
- Google Fonts：Noto Sans SC + JetBrains Mono

## 📁 项目结构

```
cloudninja-aliyun/
├── index.html              # 首页
├── practice.html           # 模拟考试列表
├── quiz.html               # 答题系统（核心）
├── certifications.html     # 认证指南
├── game.html               # 学习游戏
├── about.html              # 关于
├── contact.html            # 联系
├── style.css               # 全局样式 + 主题变量
├── app.js                  # 导航、页脚、主题切换（共享）
├── exam-config.js          # 考试方向统一配置（时长 / 通过线）
├── questions-bank.js       # 统一题库加载器（合并 + 去重）
└── acp-quiz/
    ├── questions-data.js     # 主题库（160 题）
    ├── questions-rds.js      # RDS 题库（18 题）
    ├── questions-extra.js    # 扩展考点题库（25 题：NAS/PolarDB/VPC/成本优化/云监控/安全）
    ├── questions-devops.js   # ACP DevOps 题库（140 题：云效/ACK/ACR/IaC/可观测/发布策略/微服务）
    └── questions-ack.js      — ACE 容器服务 ACK 专项题库（7 域，140 题）
```

## 🚀 快速开始

### 本地运行

直接用浏览器打开 `index.html` 即可，或启动本地服务器：

```bash
python -m http.server 8080
```

访问 `http://localhost:8080`

### 直接答题

| 认证方向 | 练习模式 | 考试模式 |
|---------|---------|---------|
| ACA 云计算 | `quiz.html?exam=aca-cloud&mode=practice` | `quiz.html?exam=aca-cloud&mode=exam` |
| ACP 云计算 | `quiz.html?exam=acp-cloud&mode=practice` | `quiz.html?exam=acp-cloud&mode=exam` |
| ACP 云安全 | `quiz.html?exam=acp-security&mode=practice` | `quiz.html?exam=acp-security&mode=exam` |
| ACP DevOps 专业工程师 | `quiz.html?exam=acp-devops&mode=practice` | `quiz.html?exam=acp-devops&mode=exam` |
| ACE ACK 容器服务专项 | `quiz.html?exam=ace-ack&mode=practice` | `quiz.html?exam=ace-ack&mode=exam` |

- ACE ACK 容器服务专项：quiz.html?exam=ace-ack&n=50

## 📝 题库说明

### 题库构成矩阵（按认证方向）

| 认证专项 | 题数 | 知识域分布 | 纯度说明 |
|---------|------|-----------|---------|
| ACP DevOps 专业工程师 (acp-devops) | 140 道 | 7 域（云效/ACK/ACR/IaC/可观测/发布策略/微服务治理） | — |
| ACE 容器服务专项 (ace-ack) | 140 道 | 7 域（life/net/store/work/hpa/sec/ops） | ≥38/50 核心题，纯度≥76% |

### 题库源文件清单

题库数据位于以下文件中：

| 文件 | 题数 | 覆盖模块 |
|------|------|---------|
| `acp-quiz/questions-data.js` | 160 | ECS、SLB、OSS、VPC、云安全、弹性伸缩、CDN、云计算通用 |
| `acp-quiz/questions-rds.js` | 18 | 云数据库 RDS（2026 大纲新增）：高可用/只读实例/读写分离/备份恢复/DTS/TDE 等 |
| `acp-quiz/questions-extra.js` | 25 | NAS、PolarDB、经典VsVPC、成本优化、云监控、WAF/DDoS/堡垒机/KMS |
| `acp-quiz/questions-devops.js` | 140 | 云效 DevOps 平台、容器服务 ACK、容器镜像 ACR、IaC（ROS/Terraform/OOS）、可观测（SLS/ARMS/Prometheus）、发布部署策略、微服务治理（MSE/ASM） |
| `acp-quiz/questions-ack.js` | 140 | ACE 容器服务专项 (ace-ack)：7 域（life/net/store/work/hpa/sec/ops），≥38/50 核心题，纯度≥76% |
| `quiz.html`（内联精选题） | 12 | ECS、OSS、VPC、RDS、SLB、安全组、云监控、弹性伸缩、RAM、NAT 网关、快照 |

`questions-bank.js` 负责合并所有题库并按题目文本自动去重，按认证方向筛选知识点，随机抽取 50 题组成一场考试，确保同一场考试不会出现重复题。

每道题包含：
- `question`：题干
- `options`：选项数组
- `correctAnswers`：正确答案索引数组
- `explanation`：详细解析
- `ref`：阿里云官方文档参考链接

## 🎨 主题切换

点击导航栏右上角的 🌙 / ☀️ 按钮切换暗色 / 亮色主题。

也支持 URL 参数强制指定：`?theme=light` 或 `?theme=dark`

## 📄 License

MIT License

## ⚠️ 声明

阿里云及所有相关认证（ACA / ACP / ACE）均为阿里云计算有限公司的商标。本项目为独立学习备考工具，与阿里云官方无关联。
