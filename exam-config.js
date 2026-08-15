/* ============================================================
 * 云忍者 — 考试方向统一配置（practice / quiz / certifications 共用）
 * 时长与通过线以阿里云官方认证口径为准：
 *   ACA 50 题 / 60 分钟 / 80 分
 *   ACP 100 题 / 120 分钟 / 80 分
 *   ACE 笔试 61 题 / 180 分钟 / 90 分
 * 本站模拟考试统一抽取 50 题，时长与通过线按官方标准展示。
 * ============================================================ */

const EXAM_META = {
    'aca-cloud':    { name: '云计算助理工程师', level: 'ACA', qcount: 50, duration: 60,  passScore: 80 },
    'aca-security': { name: '云安全助理工程师', level: 'ACA', qcount: 50, duration: 60,  passScore: 80 },
    'acp-cloud':    { name: '云计算高级工程师', level: 'ACP', qcount: 50, duration: 120, passScore: 80 },
    'acp-security': { name: '云安全高级工程师', level: 'ACP', qcount: 50, duration: 120, passScore: 80 },
    'acp-devops':   { name: 'DevOps 高级工程师', level: 'ACP', qcount: 50, duration: 120, passScore: 80 },
    'ace-cloud':    { name: '云计算专家工程师', level: 'ACE', qcount: 50, duration: 180, passScore: 90 },
    'ace-security': { name: '云安全专家工程师', level: 'ACE', qcount: 50, duration: 180, passScore: 90 }
};

/* 当前已开放练习的方向（certifications 详情页据此决定是否显示"开始练习"） */
const EXAM_SUPPORTED = Object.keys(EXAM_META);
